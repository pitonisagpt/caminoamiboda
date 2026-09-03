import io
import os
from datetime import datetime
from decimal import Decimal
from pathlib import Path
from typing import List, Optional
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from jinja2 import Environment, FileSystemLoader
from pydantic import BaseModel, model_validator
from sqlalchemy.orm import Session

from app.config import settings
from app.core.dependencies import get_current_user
from app.core.files import safe_pdf_path
from app.database import get_db
from app.models.reservation import Reservation
from app.models.reservation_contract import ReservationContract
from app.models.reservation_payment_schedule_item import ReservationPaymentScheduleItem
from app.schemas.reservation_contract import ReservationContractRead, ReservationContractUpdate
from app.services.event_span import effective_end_date

# Not admin-gated: unlike VehicleOwnerContract (owner-facing, carries the
# revenue split — admin-only per CLAUDE.md), a customer rental contract
# carries no owner/revenue-split data and is squarely a reservation-
# management task operations already does (create/manage reservations,
# quotes, service orders) — same open-to-any-authenticated-user gating as
# quotes.py/service_orders.py, not vehicle_owner_contracts.py.
router = APIRouter(
    prefix="/api/reservations",
    tags=["reservation-contracts"],
    dependencies=[Depends(get_current_user)],
    redirect_slashes=False,
)

MONTHS_ES = {
    1: "enero", 2: "febrero", 3: "marzo", 4: "abril",
    5: "mayo", 6: "junio", 7: "julio", 8: "agosto",
    9: "septiembre", 10: "octubre", 11: "noviembre", 12: "diciembre",
}
TEMPLATE_DIR = Path(__file__).parent.parent.parent / "templates"

# Same pattern as app/services/pdf_generator.py's _amount_in_words (used for
# billing documents) — num2words is already a declared dependency
# (requirements.txt), not something new added for this feature.
def _amount_in_words(amount) -> str:
    try:
        from num2words import num2words
        return f"{num2words(int(amount), lang='es')} pesos m/cte"
    except ImportError:
        return f"{int(amount):,} pesos m/cte".replace(",", ".")


def _format_date_es(d) -> str:
    if d is None:
        return ""
    return f"{d.day} de {MONTHS_ES[d.month]} de {d.year}"


def _format_cop(amount) -> str:
    if amount is None:
        return "—"
    return f"COP ${int(amount):,}".replace(",", ".")


def _next_contract_number(db: Session) -> str:
    now = datetime.now()
    prefix = f"ARR-{now.year}-"
    last = (
        db.query(ReservationContract)
        .filter(ReservationContract.contract_number.like(f"{prefix}%"))
        .order_by(ReservationContract.contract_number.desc())
        .first()
    )
    seq = int(last.contract_number.split("-")[-1]) + 1 if last else 1
    return f"{prefix}{seq:03d}"


def _get_reservation(reservation_id: int, db: Session) -> Reservation:
    r = db.query(Reservation).filter(Reservation.id == reservation_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    return r


def _get_or_create_contract(reservation_id: int, db: Session) -> ReservationContract:
    contract = db.query(ReservationContract).filter(ReservationContract.reservation_id == reservation_id).first()
    if contract:
        return contract
    reservation = _get_reservation(reservation_id, db)
    customer = reservation.customer
    contract = ReservationContract(
        reservation_id=reservation_id,
        contract_number=_next_contract_number(db),
        client_name=(customer.main_contact_name if customer else "") or "",
        client_id_number=(customer.identification_number if customer else "") or "",
    )
    db.add(contract)
    db.commit()
    db.refresh(contract)
    return contract


@router.get("/{reservation_id}/contract", response_model=ReservationContractRead)
def get_contract(reservation_id: int, db: Session = Depends(get_db)):
    _get_reservation(reservation_id, db)
    contract = db.query(ReservationContract).filter(ReservationContract.reservation_id == reservation_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contrato no generado aún")
    return ReservationContractRead.model_validate(contract)


@router.post("/{reservation_id}/contract", response_model=ReservationContractRead)
def get_or_create_contract(reservation_id: int, db: Session = Depends(get_db)):
    _get_reservation(reservation_id, db)
    return ReservationContractRead.model_validate(_get_or_create_contract(reservation_id, db))


@router.put("/{reservation_id}/contract", response_model=ReservationContractRead)
def update_contract(reservation_id: int, body: ReservationContractUpdate, db: Session = Depends(get_db)):
    contract = _get_or_create_contract(reservation_id, db)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(contract, field, value)
    db.commit()
    db.refresh(contract)
    return ReservationContractRead.model_validate(contract)


@router.post("/{reservation_id}/contract/generate-pdf", response_model=ReservationContractRead)
def generate_contract_pdf(reservation_id: int, db: Session = Depends(get_db)):
    reservation = _get_reservation(reservation_id, db)
    contract = _get_or_create_contract(reservation_id, db)
    vehicle = reservation.vehicle
    customer = reservation.customer

    # Payment schedule: configured lines override the default 50/50 text.
    schedule_rows = (
        db.query(ReservationPaymentScheduleItem)
        .filter(ReservationPaymentScheduleItem.reservation_id == reservation_id)
        .order_by(ReservationPaymentScheduleItem.display_order)
        .all()
    )
    total = reservation.total_amount
    payment_schedule = []
    for item in schedule_rows:
        if item.percentage is not None:
            amount = (total * item.percentage / Decimal(100)).quantize(Decimal("0.01"))
            amount_text = f"un valor equivalente al {item.percentage}% del valor total del arrendamiento, correspondiente a {_format_cop(amount)}"
        else:
            amount_text = f"un valor de {_format_cop(item.fixed_amount)}"
        payment_schedule.append({"description": item.description, "amount_text": amount_text})

    half = (total * Decimal("0.5")).quantize(Decimal("0.01"))

    tls = reservation.timelines if reservation.timelines else []
    activities = []
    if tls:
        from app.models.timeline_activity import TimelineActivity
        activities = db.query(TimelineActivity).filter(TimelineActivity.timeline_id == tls[0].id).all()
    event_end_date = effective_end_date(reservation.event_date, activities)

    today = datetime.now(ZoneInfo("America/Bogota")).date()

    env = Environment(loader=FileSystemLoader(str(TEMPLATE_DIR)), autoescape=True)
    template = env.get_template("reservation_contract.html")

    html = template.render(
        contract=contract,
        reservation=reservation,
        vehicle=vehicle,
        customer_email=customer.email if customer else None,
        customer_contact=(customer.whatsapp or customer.phone) if customer else None,
        formatted_date=_format_date_es(today),
        formatted_event_date=_format_date_es(reservation.event_date),
        formatted_event_end_date=_format_date_es(event_end_date) if event_end_date != reservation.event_date else None,
        formatted_total_amount=_format_cop(total),
        amount_in_words=_amount_in_words(total),
        payment_schedule=payment_schedule,
        formatted_half_amount=_format_cop(half),
        formatted_decoration_removal_date=_format_date_es(reservation.decoration_removal_date) if reservation.decoration_removal_date else None,
        formatted_soat=_format_date_es(vehicle.soat_expiration) if vehicle and vehicle.soat_expiration else None,
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

    output_dir = Path(settings.pdf_storage_path) / "reservation_contracts"
    output_dir.mkdir(parents=True, exist_ok=True)
    pdf_path = output_dir / f"{contract.contract_number}.pdf"

    try:
        from weasyprint import HTML as WeasyHTML
        WeasyHTML(string=html, base_url=str(TEMPLATE_DIR)).write_pdf(str(pdf_path))
    except Exception:
        from xhtml2pdf import pisa
        with open(str(pdf_path), "wb") as f:
            pisa.CreatePDF(io.StringIO(html), dest=f)

    contract.pdf_path = str(pdf_path)
    db.commit()
    db.refresh(contract)
    return ReservationContractRead.model_validate(contract)


@router.get("/{reservation_id}/contract/pdf")
def download_contract_pdf(reservation_id: int, db: Session = Depends(get_db)):
    _get_reservation(reservation_id, db)
    contract = db.query(ReservationContract).filter(ReservationContract.reservation_id == reservation_id).first()
    if not contract or not contract.pdf_path or not os.path.exists(contract.pdf_path):
        raise HTTPException(404, "PDF no generado aún")
    pdf = safe_pdf_path(contract.pdf_path, Path(settings.pdf_storage_path))
    return FileResponse(
        path=str(pdf),
        media_type="application/pdf",
        filename=f"{contract.contract_number}.pdf",
        headers={"Cache-Control": "no-store"},
    )


# ── Payment schedule sub-resource ──────────────────────────────────────────

class PaymentScheduleItemCreate(BaseModel):
    description: str
    percentage: Optional[Decimal] = None
    fixed_amount: Optional[Decimal] = None

    @model_validator(mode="after")
    def _exactly_one_amount(self):
        if (self.percentage is None) == (self.fixed_amount is None):
            raise ValueError("Debe indicar exactamente uno: percentage o fixed_amount")
        return self


class PaymentScheduleItemRead(BaseModel):
    id: int
    reservation_id: int
    description: str
    percentage: Optional[Decimal]
    fixed_amount: Optional[Decimal]
    display_order: int
    created_at: datetime

    model_config = {"from_attributes": True}


@router.get("/{reservation_id}/payment-schedule", response_model=List[PaymentScheduleItemRead])
def list_payment_schedule(reservation_id: int, db: Session = Depends(get_db)):
    _get_reservation(reservation_id, db)
    return (
        db.query(ReservationPaymentScheduleItem)
        .filter(ReservationPaymentScheduleItem.reservation_id == reservation_id)
        .order_by(ReservationPaymentScheduleItem.display_order)
        .all()
    )


@router.post("/{reservation_id}/payment-schedule", response_model=PaymentScheduleItemRead, status_code=201)
def add_payment_schedule_item(reservation_id: int, body: PaymentScheduleItemCreate, db: Session = Depends(get_db)):
    _get_reservation(reservation_id, db)
    max_order = db.query(ReservationPaymentScheduleItem).filter(ReservationPaymentScheduleItem.reservation_id == reservation_id).count()
    item = ReservationPaymentScheduleItem(
        reservation_id=reservation_id,
        description=body.description,
        percentage=body.percentage,
        fixed_amount=body.fixed_amount,
        display_order=max_order,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{reservation_id}/payment-schedule/{item_id}", status_code=204)
def delete_payment_schedule_item(reservation_id: int, item_id: int, db: Session = Depends(get_db)):
    item = db.query(ReservationPaymentScheduleItem).filter(
        ReservationPaymentScheduleItem.id == item_id,
        ReservationPaymentScheduleItem.reservation_id == reservation_id,
    ).first()
    if not item:
        raise HTTPException(404, "Línea del plan de pagos no encontrada")
    db.delete(item)
    db.commit()
