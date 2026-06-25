from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.reservation import Reservation, ReservationStatus
from app.models.quote import Quote
from app.schemas.reservation import ReservationCreate, ReservationList, ReservationRead, ReservationUpdate

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


@router.get("/api/reservations", response_model=List[ReservationList], dependencies=[Depends(get_current_user)])
def list_reservations(
    status: Optional[ReservationStatus] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(Reservation).order_by(Reservation.event_date.asc())
    if status:
        q = q.filter(Reservation.status == status)
    return [ReservationList.build(r) for r in q.all()]


@router.post("/api/reservations", response_model=ReservationRead, status_code=201, dependencies=[Depends(get_current_user)])
def create_reservation(body: ReservationCreate, db: Session = Depends(get_db)):
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
