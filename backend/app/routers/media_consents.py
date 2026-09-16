import io
import os
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from jinja2 import Environment, FileSystemLoader
from sqlalchemy.orm import Session

from app.config import settings
from app.core.dependencies import get_current_user
from app.core.files import safe_pdf_path
from app.database import get_db
from app.models.media_consent import MediaConsent
from app.models.reservation import Reservation
from app.schemas.media_consent import MediaConsentRead, MediaConsentUpdate

# Same gating as reservation_contracts.py: no financial/split data here
# either, so this is squarely a reservation-management task operations
# already does — open to any authenticated user, not admin-only.
router = APIRouter(
    prefix="/api/reservations",
    tags=["media-consents"],
    dependencies=[Depends(get_current_user)],
    redirect_slashes=False,
)

MONTHS_ES = {
    1: "enero", 2: "febrero", 3: "marzo", 4: "abril",
    5: "mayo", 6: "junio", 7: "julio", 8: "agosto",
    9: "septiembre", 10: "octubre", 11: "noviembre", 12: "diciembre",
}
TEMPLATE_DIR = Path(__file__).parent.parent.parent / "templates"


def _format_date_es(d) -> str:
    if d is None:
        return ""
    return f"{d.day} de {MONTHS_ES[d.month]} de {d.year}"


def _next_consent_number(db: Session) -> str:
    now = datetime.now()
    prefix = f"AUT-{now.year}-"
    last = (
        db.query(MediaConsent)
        .filter(MediaConsent.consent_number.like(f"{prefix}%"))
        .order_by(MediaConsent.consent_number.desc())
        .first()
    )
    seq = int(last.consent_number.split("-")[-1]) + 1 if last else 1
    return f"{prefix}{seq:03d}"


def _get_reservation(reservation_id: int, db: Session) -> Reservation:
    r = db.query(Reservation).filter(Reservation.id == reservation_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    return r


def _get_or_create_consent(reservation_id: int, db: Session) -> MediaConsent:
    consent = db.query(MediaConsent).filter(MediaConsent.reservation_id == reservation_id).first()
    if consent:
        return consent
    reservation = _get_reservation(reservation_id, db)
    customer = reservation.customer
    consent = MediaConsent(
        reservation_id=reservation_id,
        consent_number=_next_consent_number(db),
        bride_name=(customer.bride_name if customer else "") or "",
        groom_name=(customer.groom_name if customer else "") or "",
    )
    db.add(consent)
    db.commit()
    db.refresh(consent)
    return consent


@router.get("/{reservation_id}/media-consent", response_model=MediaConsentRead)
def get_media_consent(reservation_id: int, db: Session = Depends(get_db)):
    _get_reservation(reservation_id, db)
    consent = db.query(MediaConsent).filter(MediaConsent.reservation_id == reservation_id).first()
    if not consent:
        raise HTTPException(status_code=404, detail="Documento no generado aún")
    return MediaConsentRead.model_validate(consent)


@router.post("/{reservation_id}/media-consent", response_model=MediaConsentRead)
def get_or_create_media_consent(reservation_id: int, db: Session = Depends(get_db)):
    _get_reservation(reservation_id, db)
    return MediaConsentRead.model_validate(_get_or_create_consent(reservation_id, db))


@router.put("/{reservation_id}/media-consent", response_model=MediaConsentRead)
def update_media_consent(reservation_id: int, body: MediaConsentUpdate, db: Session = Depends(get_db)):
    consent = _get_or_create_consent(reservation_id, db)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(consent, field, value)
    db.commit()
    db.refresh(consent)
    return MediaConsentRead.model_validate(consent)


@router.post("/{reservation_id}/media-consent/generate-pdf", response_model=MediaConsentRead)
def generate_media_consent_pdf(reservation_id: int, db: Session = Depends(get_db)):
    reservation = _get_reservation(reservation_id, db)
    consent = _get_or_create_consent(reservation_id, db)

    today = datetime.now(ZoneInfo("America/Bogota")).date()

    env = Environment(loader=FileSystemLoader(str(TEMPLATE_DIR)), autoescape=True)
    template = env.get_template("media_consent.html")

    html = template.render(
        consent=consent,
        reservation=reservation,
        formatted_date=_format_date_es(today),
        formatted_event_date=_format_date_es(reservation.event_date),
        signature_day=today.day,
        signature_month_es=MONTHS_ES[today.month],
        signature_year=today.year,
        company_name=settings.company_name,
        company_owner=settings.company_owner,
        company_phone=settings.company_phone,
        company_cc=settings.company_cc,
        company_email=settings.company_email,
        city=settings.city,
    )

    output_dir = Path(settings.pdf_storage_path) / "media_consents"
    output_dir.mkdir(parents=True, exist_ok=True)
    pdf_path = output_dir / f"{consent.consent_number}.pdf"

    try:
        from weasyprint import HTML as WeasyHTML
        WeasyHTML(string=html, base_url=str(TEMPLATE_DIR)).write_pdf(str(pdf_path))
    except Exception:
        from xhtml2pdf import pisa
        with open(str(pdf_path), "wb") as f:
            pisa.CreatePDF(io.StringIO(html), dest=f)

    consent.pdf_path = str(pdf_path)
    db.commit()
    db.refresh(consent)
    return MediaConsentRead.model_validate(consent)


@router.get("/{reservation_id}/media-consent/pdf")
def download_media_consent_pdf(reservation_id: int, db: Session = Depends(get_db)):
    _get_reservation(reservation_id, db)
    consent = db.query(MediaConsent).filter(MediaConsent.reservation_id == reservation_id).first()
    if not consent or not consent.pdf_path or not os.path.exists(consent.pdf_path):
        raise HTTPException(404, "PDF no generado aún")
    pdf = safe_pdf_path(consent.pdf_path, Path(settings.pdf_storage_path))
    return FileResponse(
        path=str(pdf),
        media_type="application/pdf",
        filename=f"{consent.consent_number}.pdf",
        headers={"Cache-Control": "no-store"},
    )
