from datetime import date, datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import asc, desc, or_
from sqlalchemy.orm import Session, outerjoin, selectinload

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.customer import Customer
from app.models.reservation import Reservation, ReservationStatus
from app.models.quote import Quote
from app.schemas.reservation import ReservationCreate, ReservationList, ReservationPage, ReservationRead, ReservationUpdate
from app.services.conflicts import find_conflicts

router = APIRouter(tags=["reservations"], redirect_slashes=False)


def _next_number(db: Session) -> str:
    now = datetime.now()
    prefix = f"RES-{now.strftime('%Y%m')}-"
    last = (
        db.query(Reservation)
        .filter(Reservation.reservation_number.like(f"{prefix}%"))
        .order_by(Reservation.reservation_number.desc())
        .first()
    )
    seq = 1
    if last:
        try:
            seq = int(last.reservation_number.split("-")[-1]) + 1
        except ValueError:
            pass
    return f"{prefix}{seq:03d}"


def _get(reservation_id: int, db: Session) -> Reservation:
    r = db.query(Reservation).filter(Reservation.id == reservation_id).first()
    if not r:
        raise HTTPException(404, "Reserva no encontrada")
    return r


_SORT_COLS = {
    "event_date":         Reservation.event_date,
    "reservation_number": Reservation.reservation_number,
    "total_amount":       Reservation.total_amount,
    "deposit_paid":       Reservation.deposit_paid,
    "status":             Reservation.status,
    "created_at":         Reservation.created_at,
    "customer":           Customer.main_contact_name,
}


@router.get("/api/reservations", response_model=ReservationPage, dependencies=[Depends(get_current_user)])
def list_reservations(
    status: Optional[ReservationStatus] = Query(None),
    event_category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort_by: str = Query("event_date"),
    sort_dir: str = Query("desc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: Session = Depends(get_db),
):
    q = (db.query(Reservation)
         .outerjoin(Customer, Reservation.customer_id == Customer.id)
         .options(selectinload(Reservation.timelines)))

    if status:
        q = q.filter(Reservation.status == status)
    if event_category:
        q = q.filter(Reservation.event_category == event_category)
    if date_from:
        q = q.filter(Reservation.event_date >= date_from)
    if date_to:
        q = q.filter(Reservation.event_date <= date_to)
    if search:
        pat = f"%{search}%"
        q = q.filter(or_(
            Reservation.reservation_number.ilike(pat),
            Reservation.notes.ilike(pat),
            Customer.main_contact_name.ilike(pat),
            Customer.bride_name.ilike(pat),
            Customer.groom_name.ilike(pat),
            Customer.phone.ilike(pat),
        ))

    col = _SORT_COLS.get(sort_by, Reservation.event_date)
    q = q.order_by(desc(col) if sort_dir == "desc" else asc(col))

    total = q.count()
    items = q.offset((page - 1) * page_size).limit(page_size).all()

    return ReservationPage(
        items=[ReservationList.build(r) for r in items],
        total=total,
        page=page,
        page_size=page_size,
        pages=max(1, -(-total // page_size)),
    )


@router.post("/api/reservations", response_model=ReservationRead, status_code=201, dependencies=[Depends(get_current_user)])
def create_reservation(body: ReservationCreate, db: Session = Depends(get_db)):
    blocking = [c for c in find_conflicts(
        db, body.event_date, body.vehicle_id, body.driver_id,
        new_start=body.start_time, new_end=body.end_time,
    ) if c["severity"] == "blocking"]
    if blocking:
        raise HTTPException(status_code=409, detail={"conflicts": blocking})
    r = Reservation(**body.model_dump(), reservation_number=_next_number(db))
    db.add(r)
    db.commit()
    db.refresh(r)
    return ReservationRead.build(r)


@router.get("/api/reservations/{reservation_id}", response_model=ReservationRead, dependencies=[Depends(get_current_user)])
def get_reservation(reservation_id: int, db: Session = Depends(get_db)):
    return ReservationRead.build(_get(reservation_id, db))


@router.put("/api/reservations/{reservation_id}", response_model=ReservationRead, dependencies=[Depends(get_current_user)])
def update_reservation(reservation_id: int, body: ReservationUpdate, db: Session = Depends(get_db)):
    r = _get(reservation_id, db)
    changed = body.model_dump(exclude_unset=True)
    # Resolve final values for conflict check (prefer incoming, fall back to current)
    chk_date     = changed.get("event_date", r.event_date)
    chk_vehicle  = changed.get("vehicle_id", r.vehicle_id)
    chk_driver   = changed.get("driver_id", r.driver_id)
    chk_start    = changed.get("start_time", r.start_time)
    chk_end      = changed.get("end_time", r.end_time)
    blocking = [c for c in find_conflicts(
        db, chk_date, chk_vehicle, chk_driver,
        new_start=chk_start, new_end=chk_end, exclude_id=reservation_id,
    ) if c["severity"] == "blocking"]
    if blocking:
        raise HTTPException(status_code=409, detail={"conflicts": blocking})
    status_or_category_changed = "status" in changed or "event_category" in changed
    for field, value in changed.items():
        setattr(r, field, value)
    db.commit()
    db.refresh(r)

    if status_or_category_changed:
        _sync_linked_timelines(r, db)

    return ReservationRead.build(r)


def _sync_linked_timelines(reservation, db):
    from app.models.event_timeline import EventTimeline
    from app.services.google_calendar_service import calendar_category_for
    from app.routers.timelines import _gcal_sync

    new_category = calendar_category_for(reservation)
    linked = db.query(EventTimeline).filter(
        EventTimeline.reservation_id == reservation.id,
        EventTimeline.gcal_imported.is_(False),
    ).all()
    for tl in linked:
        tl.calendar_category = new_category
        db.commit()
        _gcal_sync(tl, db, "on reservation change")


@router.delete("/api/reservations/{reservation_id}", status_code=204, dependencies=[Depends(get_current_user)])
def delete_reservation(reservation_id: int, db: Session = Depends(get_db)):
    r = _get(reservation_id, db)
    db.delete(r)
    db.commit()


@router.post("/api/reservations/from-quote/{quote_id}", response_model=ReservationRead, status_code=201, dependencies=[Depends(get_current_user)])
def create_from_quote(quote_id: int, db: Session = Depends(get_db)):
    quote = db.query(Quote).filter(Quote.id == quote_id).first()
    if not quote:
        raise HTTPException(404, "Cotización no encontrada")
    r = Reservation(
        reservation_number=_next_number(db),
        customer_id=quote.customer_id,
        quote_id=quote.id,
        vehicle_id=quote.vehicle_id,
        event_date=quote.event_date,
        total_amount=quote.total_price,
        deposit_paid=quote.deposit_amount or 0,
        status=ReservationStatus.quoted,
    )
    db.add(r)
    quote.status = "accepted"
    db.commit()
    db.refresh(r)
    return ReservationRead.build(r)
