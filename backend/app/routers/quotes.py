import os
import uuid
from datetime import datetime
from decimal import Decimal
from io import StringIO
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from jinja2 import Environment, FileSystemLoader
from sqlalchemy.orm import Session

from app.config import settings
from app.core.dependencies import get_current_user
from app.core.files import safe_pdf_path
from app.database import get_db
from app.models.customer import Customer
from app.models.quote import LocationZone, Quote, QuoteStatus
from app.models.reservation import Reservation, ReservationStatus
from app.models.vehicle import Vehicle
from app.schemas.quote import (
    QuoteCreate, QuoteList, QuoteRead, QuoteUpdate, WhatsappTextResponse,
)
from app.schemas.reservation import ReservationRead as ReservationReadSchema

router = APIRouter(prefix="/api/quotes", tags=["quotes"], redirect_slashes=False)

MONTHS_ES = {
    1: "enero", 2: "febrero", 3: "marzo", 4: "abril",
    5: "mayo", 6: "junio", 7: "julio", 8: "agosto",
    9: "septiembre", 10: "octubre", 11: "noviembre", 12: "diciembre",
}
TEMPLATE_DIR = Path(__file__).parent.parent.parent / "templates"

ZONE_LABEL = {
    LocationZone.medellin: "Medellín y alrededores",
    LocationZone.rionegro: "Llanogrande y alrededores",
    LocationZone.other: "Otra zona",
}


def _next_quote_number(db: Session) -> str:
    now = datetime.now()
    prefix = f"COT-{now.year}{now.month:02d}-"
    count = db.query(Quote).filter(Quote.quote_number.like(f"{prefix}%")).count()
    return f"{prefix}{count + 1:03d}"


def _get_quote(quote_id: int, db: Session) -> Quote:
    q = db.query(Quote).filter(Quote.id == quote_id).first()
    if not q:
        raise HTTPException(404, "Cotización no encontrada")
    return q


def _format_date_es(d) -> str:
    if d is None:
        return ""
    return f"{d.day} de {MONTHS_ES[d.month]} de {d.year}"


def _format_cop(amount) -> str:
    if amount is None:
        return "—"
    return f"COP ${int(amount):,}".replace(",", ".")


def _build_wa_text(quote: Quote) -> str:
    lines = [
        "💍 Propuesta de Servicio – Camino a Mi Boda",
        "",
        f"Hola {quote.display_customer}! Aquí tienes la propuesta para tu boda el {_format_date_es(quote.event_date)}:",
        "",
        f"🚗 Vehículo: {quote.display_vehicle}",
        f"📅 Fecha: {_format_date_es(quote.event_date)}",
    ]
    if quote.service_duration:
        lines.append(f"🕒 Duración: {quote.service_duration}")
    lines.append(f"📍 Zona: {ZONE_LABEL.get(quote.location_zone, quote.location_zone)}")
    if quote.pickup_location:
        lines.append(f"🚩 Recogida: {quote.pickup_location}")
    if quote.ceremony_location:
        lines.append(f"⛪ Ceremonia: {quote.ceremony_location}")
    if quote.reception_location:
        lines.append(f"🥂 Recepción: {quote.reception_location}")
    lines.append("")
    lines.append(f"💰 Valor total: {_format_cop(quote.total_price)}")
    if quote.deposit_amount:
        lines.append(f"💳 Anticipo para reservar: {_format_cop(quote.deposit_amount)}")
    lines += [
        "",
        "Para confirmar o resolver dudas, escríbenos 👇",
        "+57 314 737 20 30",
        "– Camino a Mi Boda 💍",
    ]
    return "\n".join(lines)


# ── CRUD ──────────────────────────────────────────────────────────────────────

@router.get("", response_model=List[QuoteList], dependencies=[Depends(get_current_user)])
def list_quotes(
    status: Optional[QuoteStatus] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(Quote).order_by(Quote.created_at.desc())
    if status:
        q = q.filter(Quote.status == status)
    quotes = q.all()
    return [QuoteList.build(quote) for quote in quotes]


@router.post("", response_model=QuoteRead, status_code=201, dependencies=[Depends(get_current_user)])
def create_quote(body: QuoteCreate, db: Session = Depends(get_db)):
    data = body.model_dump()
    quote = Quote(
        **data,
        quote_number=_next_quote_number(db),
        status=QuoteStatus.draft,
        share_token=uuid.uuid4().hex,
    )
    db.add(quote)
    db.commit()
    db.refresh(quote)
    return QuoteRead.build(quote)


@router.get("/{quote_id}", response_model=QuoteRead, dependencies=[Depends(get_current_user)])
def get_quote(quote_id: int, db: Session = Depends(get_db)):
    return QuoteRead.build(_get_quote(quote_id, db))


@router.put("/{quote_id}", response_model=QuoteRead, dependencies=[Depends(get_current_user)])
def update_quote(quote_id: int, body: QuoteUpdate, db: Session = Depends(get_db)):
    quote = _get_quote(quote_id, db)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(quote, field, value)
    db.commit()
    db.refresh(quote)
    return QuoteRead.build(quote)


@router.delete("/{quote_id}", status_code=204, dependencies=[Depends(get_current_user)])
def delete_quote(quote_id: int, db: Session = Depends(get_db)):
    quote = _get_quote(quote_id, db)
    if quote.pdf_path and os.path.exists(quote.pdf_path):
        os.remove(quote.pdf_path)
    db.delete(quote)
    db.commit()


# ── PDF ───────────────────────────────────────────────────────────────────────

@router.post("/{quote_id}/generate-pdf", dependencies=[Depends(get_current_user)])
def generate_quote_pdf(quote_id: int, db: Session = Depends(get_db)):
    quote = _get_quote(quote_id, db)

    # Load vehicle photo URL if available
    vehicle_photo_url = None
    if quote.vehicle_id:
        from app.models.vehicle_photo import VehiclePhoto
        photo = db.query(VehiclePhoto).filter(
            VehiclePhoto.vehicle_id == quote.vehicle_id,
            VehiclePhoto.is_visible == True,
        ).order_by(VehiclePhoto.display_order).first()
        if photo:
            vehicle_photo_url = photo.url

    env = Environment(loader=FileSystemLoader(str(TEMPLATE_DIR)), autoescape=True)
    template = env.get_template("quote.html")
    html = template.render(
        quote=quote,
        display_customer=quote.display_customer,
        display_vehicle=quote.display_vehicle,
        formatted_date=_format_date_es(datetime.now().date()),
        formatted_event_date=_format_date_es(quote.event_date),
        formatted_price=_format_cop(quote.total_price),
        formatted_deposit=_format_cop(quote.deposit_amount) if quote.deposit_amount else None,
        zone_label=ZONE_LABEL.get(quote.location_zone, quote.location_zone),
        vehicle_photo_url=vehicle_photo_url,
        company_name=settings.company_name,
        company_phone=settings.company_phone,
        bank_name=settings.bank_name,
        bank_account=settings.bank_account,
        city=settings.city,
    )

    output_dir = Path(settings.pdf_storage_path) / "quotes"
    output_dir.mkdir(parents=True, exist_ok=True)
    pdf_path = output_dir / f"{quote.quote_number}.pdf"

    try:
        from weasyprint import HTML as WeasyHTML
        WeasyHTML(string=html, base_url=str(TEMPLATE_DIR)).write_pdf(str(pdf_path))
    except Exception:
        from xhtml2pdf import pisa
        with open(str(pdf_path), "wb") as f:
            pisa.CreatePDF(StringIO(html), dest=f)

    quote.pdf_path = str(pdf_path)
    if quote.status == QuoteStatus.draft:
        quote.status = QuoteStatus.sent
    db.commit()
    db.refresh(quote)
    return QuoteRead.build(quote)


@router.get("/{quote_id}/pdf", dependencies=[Depends(get_current_user)])
def download_quote_pdf(quote_id: int, db: Session = Depends(get_db)):
    quote = _get_quote(quote_id, db)
    if not quote.pdf_path or not os.path.exists(quote.pdf_path):
        raise HTTPException(404, "PDF no generado aún")
    pdf = safe_pdf_path(quote.pdf_path, Path(settings.pdf_storage_path))
    return FileResponse(
        path=str(pdf),
        media_type="application/pdf",
        filename=f"{quote.quote_number}.pdf",
    )


# ── Convert to Reservation ────────────────────────────────────────────────────

def _next_reservation_number(db: Session) -> str:
    now = datetime.now()
    prefix = f"RES-{now.strftime('%Y%m')}-"
    last = (
        db.query(Reservation)
        .filter(Reservation.reservation_number.like(f"{prefix}%"))
        .order_by(Reservation.reservation_number.desc())
        .first()
    )
    seq = int(last.reservation_number.split("-")[-1]) + 1 if last else 1
    return f"{prefix}{seq:03d}"


@router.post("/{quote_id}/convert-to-reservation", response_model=ReservationReadSchema, dependencies=[Depends(get_current_user)])
def convert_to_reservation(quote_id: int, db: Session = Depends(get_db)):
    quote = _get_quote(quote_id, db)
    if quote.status not in (QuoteStatus.draft, QuoteStatus.sent, QuoteStatus.accepted):
        raise HTTPException(400, "Solo se pueden convertir cotizaciones activas")

    deposit = quote.deposit_amount or Decimal("0")
    status = ReservationStatus.deposit_received if deposit > 0 else ReservationStatus.reserved

    addons_total = quote.addons_total or Decimal("0")

    reservation = Reservation(
        reservation_number=_next_reservation_number(db),
        customer_id=quote.customer_id,
        quote_id=quote.id,
        vehicle_id=quote.vehicle_id,
        event_date=quote.event_date,
        total_amount=quote.total_price + addons_total,
        deposit_paid=deposit,
        status=status,
        notes=quote.notes,
        extra_hours=quote.extra_hours or 0,
        addon_package_ids=quote.addon_package_ids,
        addons_total=addons_total,
    )
    db.add(reservation)
    quote.status = QuoteStatus.accepted
    db.commit()
    db.refresh(reservation)
    return ReservationReadSchema.build(reservation)


# ── WhatsApp ──────────────────────────────────────────────────────────────────

@router.get("/{quote_id}/whatsapp-text", response_model=WhatsappTextResponse, dependencies=[Depends(get_current_user)])
def get_whatsapp_text(quote_id: int, db: Session = Depends(get_db)):
    quote = _get_quote(quote_id, db)
    return WhatsappTextResponse(text=_build_wa_text(quote))
