from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from app.core.limiter import limiter
from app.core.privacy_policy import PRIVACY_POLICY_VERSION
from app.database import get_db
from app.models.customer import Customer
from app.schemas.public_lead import PublicLeadCreate, PublicLeadResponse

router = APIRouter(prefix="/api/public", tags=["public-leads"], redirect_slashes=False)

MIN_ELAPSED_MS = 3000


def _digits(s: str | None) -> str:
    return "".join(ch for ch in (s or "") if ch.isdigit())


def _find_existing(db: Session, phone_digits: str) -> Customer | None:
    if not phone_digits:
        return None
    for c in db.query(Customer).filter(
        (Customer.phone.isnot(None)) | (Customer.whatsapp.isnot(None))
    ):
        if _digits(c.phone) == phone_digits or _digits(c.whatsapp) == phone_digits:
            return c
    return None


@router.post("/leads", response_model=PublicLeadResponse, status_code=201)
@limiter.limit("5/minute;20/hour")
def create_public_lead(request: Request, body: PublicLeadCreate, db: Session = Depends(get_db)):
    if body.hp_website or body.elapsed_ms < MIN_ELAPSED_MS:
        return PublicLeadResponse(ok=True)

    now = datetime.now(timezone.utc)
    ip = get_remote_address(request)
    phone_digits = _digits(body.phone)

    note_line = (
        f"[{now.strftime('%Y-%m-%d %H:%M')}] Formulario web"
        + (f" — cómo te encontró: {body.found_via}." if body.found_via else ".")
        + (f" Mensaje: {body.message}" if body.message else "")
    )

    existing = _find_existing(db, phone_digits)
    if existing:
        existing.consent_accepted_at = now
        existing.consent_ip = ip
        existing.consent_policy_version = PRIVACY_POLICY_VERSION
        if not existing.email and body.email:
            existing.email = body.email
        if not existing.wedding_date and body.wedding_date:
            existing.wedding_date = body.wedding_date
        if not existing.bride_name and body.bride_name:
            existing.bride_name = body.bride_name
        if not existing.groom_name and body.groom_name:
            existing.groom_name = body.groom_name
        existing.notes = f"{existing.notes}\n\n{note_line}" if existing.notes else note_line
        db.commit()
        return PublicLeadResponse(ok=True)

    customer = Customer(
        main_contact_name=body.main_contact_name,
        phone=body.phone,
        whatsapp=body.phone,
        email=body.email,
        wedding_date=body.wedding_date,
        bride_name=body.bride_name,
        groom_name=body.groom_name,
        referral_source=f"{body.found_via} (formulario web)" if body.found_via else "Formulario web",
        notes=note_line,
        lead_status="activo",
        lead_temperature=None,
        consent_accepted_at=now,
        consent_ip=ip,
        consent_policy_version=PRIVACY_POLICY_VERSION,
    )
    db.add(customer)
    db.commit()
    return PublicLeadResponse(ok=True)
