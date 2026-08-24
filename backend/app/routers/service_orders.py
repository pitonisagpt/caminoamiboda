import io
import os
from datetime import datetime
from pathlib import Path
from typing import List, Optional
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from jinja2 import Environment, FileSystemLoader
from sqlalchemy.orm import Session

from app.config import settings
from app.core.dependencies import require_admin
from app.core.files import safe_pdf_path
from app.database import get_db
from app.models.reservation import Reservation
from app.models.service_order import ServiceOrder
from app.models.vehicle import Vehicle
from app.models.vehicle_owner_contract import VehicleOwnerContract
from app.schemas.service_order import ServiceOrderCreate, ServiceOrderList, ServiceOrderRead
from app.services.event_span import effective_end_date

router = APIRouter(prefix="/api/service-orders", tags=["service-orders"], redirect_slashes=False)

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
    prefix = f"OS-{now.year}-"
    last = (
        db.query(ServiceOrder)
        .filter(ServiceOrder.order_number.like(f"{prefix}%"))
        .order_by(ServiceOrder.order_number.desc())
        .first()
    )
    seq = int(last.order_number.split("-")[-1]) + 1 if last else 1
    return f"{prefix}{seq:03d}"


def _get(order_id: int, db: Session) -> ServiceOrder:
    o = db.query(ServiceOrder).filter(ServiceOrder.id == order_id).first()
    if not o:
        raise HTTPException(404, "Orden de servicio no encontrada")
    return o


@router.get("", response_model=List[ServiceOrderList], dependencies=[Depends(require_admin)])
def list_service_orders(db: Session = Depends(get_db)):
    orders = db.query(ServiceOrder).order_by(ServiceOrder.created_at.desc()).all()
    return [ServiceOrderList.build(o) for o in orders]


@router.post("", response_model=ServiceOrderRead, status_code=201, dependencies=[Depends(require_admin)])
def create_service_order(body: ServiceOrderCreate, db: Session = Depends(get_db)):
    reservation = db.query(Reservation).filter(Reservation.id == body.reservation_id).first()
    if not reservation:
        raise HTTPException(404, "Reserva no encontrada")

    vehicle_id = body.vehicle_id or reservation.vehicle_id
    owner_id = body.owner_id

    # Auto-resolve owner from the vehicle's linked owner if not explicitly provided
    if not owner_id and vehicle_id:
        vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
        if vehicle:
            owner_id = vehicle.owner_id

    order = ServiceOrder(
        order_number=_next_number(db),
        reservation_id=reservation.id,
        vehicle_id=vehicle_id,
        owner_id=owner_id,
        owner_percentage=body.owner_percentage,
        notes=body.notes,
        status="draft",
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return ServiceOrderRead.build(order)


@router.get("/{order_id}", response_model=ServiceOrderRead, dependencies=[Depends(require_admin)])
def get_service_order(order_id: int, db: Session = Depends(get_db)):
    return ServiceOrderRead.build(_get(order_id, db))


@router.post("/{order_id}/generate-pdf", response_model=ServiceOrderRead, dependencies=[Depends(require_admin)])
def generate_service_order_pdf(order_id: int, db: Session = Depends(get_db)):
    o = _get(order_id, db)

    env = Environment(loader=FileSystemLoader(str(TEMPLATE_DIR)), autoescape=True)
    template = env.get_template("orden_servicio.html")

    from app.models.event_timeline import EventTimeline
    from app.models.event_location import EventLocation
    from app.models.timeline_activity import TimelineActivity

    r = o.reservation
    v = o.vehicle
    owner = o.owner
    driver = (r.owner_driver if r.owner_driver_id else r.driver) if r else None
    timeline = db.query(EventTimeline).filter(EventTimeline.reservation_id == r.id).first() if r else None
    locations = db.query(EventLocation).filter(EventLocation.timeline_id == timeline.id).order_by(EventLocation.display_order).all() if timeline else []
    activities = db.query(TimelineActivity).filter(TimelineActivity.timeline_id == timeline.id).order_by(TimelineActivity.display_order).all() if timeline else []

    contract: Optional[VehicleOwnerContract] = None
    if owner:
        contract = db.query(VehicleOwnerContract).filter(VehicleOwnerContract.owner_id == owner.id).first()

    end_date = effective_end_date(r.event_date, activities) if r else None

    html = template.render(
        order=o,
        reservation=r,
        vehicle=v,
        owner=owner,
        driver=driver,
        contract=contract,
        timeline=timeline,
        locations=locations,
        formatted_date=_format_date_es(datetime.now(ZoneInfo("America/Bogota")).date()),
        formatted_event_date=_format_date_es(r.event_date) if r else "",
        formatted_event_end_date=_format_date_es(end_date) if end_date and r and end_date != r.event_date else None,
        formatted_value=_format_cop(r.total_amount) if r else "—",
        display_vehicle=r.display_vehicle if r else "—",
        display_customer=r.display_customer if r else "—",
        vehicle_plate=v.license_plate if v else None,
        vehicle_year=v.year if v else None,
        company_name=settings.company_name,
        company_phone=settings.company_phone,
        company_owner=settings.company_owner,
        company_cc=settings.company_cc,
        company_cc_city=settings.company_cc_city,
        company_ciiu=settings.company_ciiu,
        company_address=settings.company_address,
        company_email=settings.company_email,
        city=settings.city,
    )

    output_dir = Path(settings.pdf_storage_path) / "service_orders"
    output_dir.mkdir(parents=True, exist_ok=True)
    pdf_path = output_dir / f"{o.order_number}.pdf"

    try:
        from weasyprint import HTML as WeasyHTML
        WeasyHTML(string=html, base_url=str(TEMPLATE_DIR)).write_pdf(str(pdf_path))
    except Exception:
        from xhtml2pdf import pisa
        with open(str(pdf_path), "wb") as f:
            pisa.CreatePDF(io.StringIO(html), dest=f)

    o.pdf_path = str(pdf_path)
    db.commit()
    db.refresh(o)
    return ServiceOrderRead.build(o)


@router.get("/{order_id}/pdf", dependencies=[Depends(require_admin)])
def download_service_order_pdf(order_id: int, db: Session = Depends(get_db)):
    o = _get(order_id, db)
    if not o.pdf_path or not os.path.exists(o.pdf_path):
        raise HTTPException(404, "PDF no generado aún")
    pdf = safe_pdf_path(o.pdf_path, Path(settings.pdf_storage_path))
    return FileResponse(
        path=str(pdf),
        media_type="application/pdf",
        filename=f"{o.order_number}.pdf",
        headers={"Cache-Control": "no-store"},
    )
