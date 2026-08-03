from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.core.limiter import limiter
from app.database import get_db
from app.config import settings
from app.models.ai_assistant import AiAssistantStatus, AiAssistantUsage
from app.schemas.ai_assistant import (
    AiAssistantMessageRequest,
    AiAssistantMessageResponse,
    AiAssistantReenableResponse,
    AiAssistantStatusResponse,
)
from app.services import ai_assistant_service as svc
from app.services.ai_assistant_service import _ai_configured

router = APIRouter(tags=["ai-assistant"], redirect_slashes=False)

_CACHE_TTL = timedelta(minutes=5)
_cache: dict = {"checked_at": None, "payload": None}


@router.post("/api/public/ai-assistant/message", response_model=AiAssistantMessageResponse)
@limiter.limit("10/minute;60/hour")
def send_ai_assistant_message(request: Request, body: AiAssistantMessageRequest, db: Session = Depends(get_db)):
    result = svc.send_message(
        session_id=body.session_id,
        history=[t.model_dump() for t in body.history],
        user_message=body.message,
        probe=body.probe,
        db=db,
    )
    return AiAssistantMessageResponse(**result)


def _build_status_payload(db: Session) -> AiAssistantStatusResponse:
    status_row = db.query(AiAssistantStatus).filter(AiAssistantStatus.id == 1).first()
    today_usage = db.query(AiAssistantUsage).filter(AiAssistantUsage.usage_date == date.today()).first()
    return AiAssistantStatusResponse(
        configured=_ai_configured(),
        enabled=status_row.enabled if status_row else True,
        disabled_reason=status_row.disabled_reason if status_row else None,
        disabled_at=status_row.disabled_at if status_row else None,
        disabled_detail=status_row.disabled_detail if status_row else None,
        consecutive_error_count=status_row.consecutive_error_count if status_row else 0,
        daily_message_count=today_usage.message_count if today_usage else 0,
        daily_message_budget=settings.ai_assistant_daily_message_budget,
    )


@router.get(
    "/api/integrations/ai-assistant/status",
    response_model=AiAssistantStatusResponse,
    dependencies=[Depends(get_current_user)],
)
def ai_assistant_status(db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    if _cache["checked_at"] and now - _cache["checked_at"] < _CACHE_TTL:
        return _cache["payload"]
    payload = _build_status_payload(db)
    _cache["checked_at"] = now
    _cache["payload"] = payload
    return payload


@router.post(
    "/api/integrations/ai-assistant/reenable",
    response_model=AiAssistantReenableResponse,
    dependencies=[Depends(get_current_user)],
)
def ai_assistant_reenable(db: Session = Depends(get_db)):
    result = svc.test_and_reenable(db)
    _cache["checked_at"] = None
    return AiAssistantReenableResponse(**result)
