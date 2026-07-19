from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends

from app.core.dependencies import get_current_user

router = APIRouter(prefix="/api/integrations", tags=["integrations"])

_CACHE_TTL = timedelta(minutes=5)
_cache: dict = {"checked_at": None, "connected": True}


@router.get("/google-calendar/status", dependencies=[Depends(get_current_user)])
def google_calendar_status():
    from app.services.google_calendar_service import _gcal_configured, _get_service

    now = datetime.now(timezone.utc)
    if _cache["checked_at"] and now - _cache["checked_at"] < _CACHE_TTL:
        return {"connected": _cache["connected"]}

    connected = False
    if _gcal_configured():
        try:
            _get_service().calendars().get(calendarId="primary").execute()
            connected = True
        except Exception:
            connected = False

    _cache["checked_at"] = now
    _cache["connected"] = connected
    return {"connected": connected}
