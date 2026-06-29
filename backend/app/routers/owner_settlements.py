import io
import os
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from jinja2 import Environment, FileSystemLoader
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.core.dependencies import get_current_user, require_admin
from app.core.files import safe_pdf_path
from app.database import get_db
from app.models.owner_settlement import OwnerSettlement
from app.models.owner_settlement_payment import OwnerSettlementPayment
from app.models.reservation import Reservation
from app.models.vehicle import Vehicle
from app.models.vehicle_owner import VehicleOwner
from app.schemas.owner_settlement import OwnerSettlementCreate, OwnerSettlementList, OwnerSettlementRead

router = APIRouter(prefix="/api/owner-settlements", tags=["owner-settlements"], redirect_slashes=False)

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


def _format_cop(amount) -> str:
    if amount is None:
        return "—"
    return f"COP ${int(amount):,}".replace(",", ".")


def _next_number(db: Session) -> str:
    now = datetime.now()
    prefix = f"LIQ-{now.year}-"
    last = (
        db.query(OwnerSettlement)
        .filter(OwnerSettlement.settlement_number.like(f"{prefix}%"))
        .order_by(OwnerSettlement.settlement_number.desc())
        .first()
    )
    seq = int(last.settlement_number.split("-")[-1]) + 1 if last else 1
    return f"{prefix}{seq:03d}"


def _get(settlement_id: int, db: Session) -> OwnerSettlement:
    s = db.query(OwnerSettlement).filter(OwnerSettlement.id == settlement_id).first()
    if not s:
        raise HTTPException(404, "Liquidación no encontrada")
    return s


@router.get("", response_model=List[OwnerSettlementList], dependencies=[Depends(require_admin)])
def list_settlements(db: Session = Depends(get_db)):
    settlements = db.query(OwnerSettlement).order_by(OwnerSettlement.created_at.desc()).all()
    return [OwnerSettlementList.build(s) for s in settlements]


@router.post("", response_model=OwnerSettlementRead, status_code=201, dependencies=[Depends(require_admin)])
def create_settlement(body: OwnerSettlementCreate, db: Session = Depends(get_db)):
    reservation = db.query(Reservation).filter(Reservation.id == body.reservation_id).first()
    if not reservation:
        raise HTTPException(404, "Reserva no encontrada")

    value = reservation.total_amount
    pct = body.owner_percentage
    owner_amount = (value * Decimal(pct) / Decimal(100)).quantize(Decimal("0.01"))
    company_amount = (value - owner_amount).quantize(Decimal("0.01"))

    vehicle_id = body.vehicle_id or reservation.vehicle_id
    owner_id = body.owner_id

    # Auto-resolve owner from vehicle's owner_name if not explicitly provided
    if not owner_id and vehicle_id:
        vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
        if vehicle and vehicle.owner_name:
            matched = db.query(VehicleOwner).filter(
                VehicleOwner.full_name == vehicle.owner_name
            ).first()
            if matched:
                owner_id = matched.id

    settlement = OwnerSettlement(
        settlement_number=_next_number(db),
        reservation_id=reservation.id,
        vehicle_id=vehicle_id,
        owner_id=owner_id,
        reservation_value=value,
        owner_percentage=pct,
        owner_amount=owner_amount,
        company_amount=company_amount,
        notes=body.notes,
        status="pending",
    )
    db.add(settlement)
    db.commit()
    db.refresh(settlement)
    return OwnerSettlementRead.build(settlement)


@router.get("/{settlement_id}", response_model=OwnerSettlementRead, dependencies=[Depends(require_admin)])
def get_settlement(settlement_id: int, db: Session = Depends(get_db)):
    return OwnerSettlementRead.build(_get(settlement_id, db))


@router.patch("/{settlement_id}/mark-paid", response_model=OwnerSettlementRead, dependencies=[Depends(require_admin)])
def mark_paid(settlement_id: int, db: Session = Depends(get_db)):
    s = _get(settlement_id, db)
    s.status = "paid"
    db.commit()
    db.refresh(s)
    return OwnerSettlementRead.build(s)


@router.post("/{settlement_id}/generate-pdf", response_model=OwnerSettlementRead, dependencies=[Depends(require_admin)])
def generate_settlement_pdf(settlement_id: int, db: Session = Depends(get_db)):
    s = _get(settlement_id, db)

    env = Environment(loader=FileSystemLoader(str(TEMPLATE_DIR)), autoescape=True)
    template = env.get_template("settlement.html")

    from app.models.event_timeline import EventTimeline
    from app.models.event_location import EventLocation
    from app.models.timeline_activity import TimelineActivity
    from app.models.reservation_payment import ReservationPayment

    r = s.reservation
    v = s.vehicle
    o = s.owner
    driver = (r.owner_driver if r.owner_driver_id else r.driver) if r else None
    driver_is_owner = bool(r and r.owner_driver_id)
    timeline = db.query(EventTimeline).filter(EventTimeline.reservation_id == r.id).first() if r else None
    locations = db.query(EventLocation).filter(EventLocation.timeline_id == timeline.id).order_by(EventLocation.display_order).all() if timeline else []
    activities = db.query(TimelineActivity).filter(TimelineActivity.timeline_id == timeline.id).order_by(TimelineActivity.display_order).all() if timeline else []
    reservation_payments = db.query(ReservationPayment).filter(ReservationPayment.reservation_id == r.id).order_by(ReservationPayment.paid_at).all() if r else []

    html = template.render(
        settlement=s,
        reservation=r,
        vehicle=v,
        owner=o,
        driver=driver,
        driver_is_owner=driver_is_owner,
        timeline=timeline,
        locations=locations,
        activities=activities,
        payments=s.payments,
        reservation_payments=reservation_payments,
        formatted_date=_format_date_es(datetime.now().date()),
        formatted_event_date=_format_date_es(r.event_date) if r else "",
        formatted_value=_format_cop(s.reservation_value),
        formatted_owner_amount=_format_cop(s.owner_amount),
        formatted_company_amount=_format_cop(s.company_amount),
        formatted_amount_paid=_format_cop(s.amount_paid),
        formatted_remaining=_format_cop(s.remaining_to_owner),
        formatted_total_paid_by_customer=_format_cop(sum(p.amount for p in reservation_payments)),
        display_vehicle=r.display_vehicle if r else "—",
        vehicle_plate=v.license_plate if v else None,
        vehicle_year=v.year if v else None,
        company_name=settings.company_name,
        company_phone=settings.company_phone,
        company_owner=settings.company_owner,
        company_cc=settings.company_cc,
        bank_name=settings.bank_name,
        bank_account=settings.bank_account,
        city=settings.city,
    )

    output_dir = Path(settings.pdf_storage_path) / "settlements"
    output_dir.mkdir(parents=True, exist_ok=True)
    pdf_path = output_dir / f"{s.settlement_number}.pdf"

    try:
        from weasyprint import HTML as WeasyHTML
        WeasyHTML(string=html, base_url=str(TEMPLATE_DIR)).write_pdf(str(pdf_path))
    except Exception:
        from xhtml2pdf import pisa
        with open(str(pdf_path), "wb") as f:
            pisa.CreatePDF(io.StringIO(html), dest=f)

    s.pdf_path = str(pdf_path)
    db.commit()
    db.refresh(s)
    return OwnerSettlementRead.build(s)


@router.get("/{settlement_id}/pdf", dependencies=[Depends(require_admin)])
def download_settlement_pdf(settlement_id: int, db: Session = Depends(get_db)):
    s = _get(settlement_id, db)
    if not s.pdf_path or not os.path.exists(s.pdf_path):
        raise HTTPException(404, "PDF no generado aún")
    pdf = safe_pdf_path(s.pdf_path, Path(settings.pdf_storage_path))
    return FileResponse(
        path=str(pdf),
        media_type="application/pdf",
        filename=f"{s.settlement_number}.pdf",
    )


# ── Settlement Payments ───────────────────────────────────────────────────────

class SettlementPaymentCreate(BaseModel):
    amount: Decimal
    paid_at: date
    notes: Optional[str] = None


class SettlementPaymentRead(BaseModel):
    id: int
    settlement_id: int
    amount: Decimal
    paid_at: date
    notes: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


def _sync_settlement_status(settlement: OwnerSettlement, db: Session) -> None:
    if settlement.amount_paid >= settlement.owner_amount:
        settlement.status = "paid"
    else:
        settlement.status = "pending"
    db.commit()


@router.get("/{settlement_id}/payments", response_model=List[SettlementPaymentRead], dependencies=[Depends(require_admin)])
def list_settlement_payments(settlement_id: int, db: Session = Depends(get_db)):
    s = _get(settlement_id, db)
    return s.payments


@router.post("/{settlement_id}/payments", response_model=SettlementPaymentRead, status_code=201, dependencies=[Depends(require_admin)])
def add_settlement_payment(settlement_id: int, body: SettlementPaymentCreate, db: Session = Depends(get_db)):
    s = _get(settlement_id, db)
    payment = OwnerSettlementPayment(
        settlement_id=settlement_id,
        amount=body.amount,
        paid_at=body.paid_at,
        notes=body.notes,
    )
    db.add(payment)
    db.flush()
    db.refresh(s)
    _sync_settlement_status(s, db)
    db.refresh(payment)
    return payment


@router.delete("/{settlement_id}/payments/{payment_id}", status_code=204, dependencies=[Depends(require_admin)])
def delete_settlement_payment(settlement_id: int, payment_id: int, db: Session = Depends(get_db)):
    payment = db.query(OwnerSettlementPayment).filter(
        OwnerSettlementPayment.id == payment_id,
        OwnerSettlementPayment.settlement_id == settlement_id,
    ).first()
    if not payment:
        raise HTTPException(404, "Pago no encontrado")
    db.delete(payment)
    db.flush()
    s = _get(settlement_id, db)
    db.refresh(s)
    _sync_settlement_status(s, db)
