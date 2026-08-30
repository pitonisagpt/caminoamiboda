from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import asc, desc, func, or_
from sqlalchemy.orm import Session, contains_eager, selectinload

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.catalog_location import CatalogLocation
from app.models.contact import Contact
from app.models.customer import Customer
from app.models.event_location import EventLocation
from app.models.event_timeline import EventTimeline
from app.models.reservation import Reservation, ReservationStatus
from app.models.reservation_payment import ReservationPayment
from app.models.reservation_vehicle import ReservationVehicle
from app.models.quote import Quote
from app.models.timeline_activity import TimelineActivity
from app.models.vehicle import Vehicle, VehicleCategory
from app.schemas.reservation import ReservationCreate, ReservationList, ReservationPage, ReservationRead, ReservationUpdate
from app.services.conflicts import find_conflicts
from app.services.event_span import MULTI_DAY_LOOKBACK_DAYS, effective_end_date
from app.services.reservation_vehicles import display_vehicle_str, get_reservation_vehicles

_UNSET = object()


def _resolve_vehicle_assignments(vehicles, vehicle_id, driver_id, owner_driver_id) -> list[dict]:
    """`vehicles` (the new list input) takes priority when present; otherwise
    fall back to the legacy singular fields as a single assignment."""
    if vehicles is not None:
        return [
            {"vehicle_id": v["vehicle_id"] if isinstance(v, dict) else v.vehicle_id,
             "driver_id": v.get("driver_id") if isinstance(v, dict) else v.driver_id,
             "owner_driver_id": v.get("owner_driver_id") if isinstance(v, dict) else v.owner_driver_id}
            for v in vehicles
        ]
    if vehicle_id:
        return [{"vehicle_id": vehicle_id, "driver_id": driver_id, "owner_driver_id": owner_driver_id}]
    return []


def _set_reservation_vehicles(r: Reservation, assignments: list[dict], db: Session) -> None:
    """Replace r's ReservationVehicle rows with `assignments` (deduped by
    vehicle_id, order preserved), and resync the legacy singular
    vehicle_id/driver_id/owner_driver_id pointers to the first one — the
    "primary" vehicle, same idiom _sync_deposit() uses for deposit_paid."""
    seen: set[int] = set()
    deduped = []
    for a in assignments:
        vid = a.get("vehicle_id")
        if not vid or vid in seen:
            continue
        seen.add(vid)
        deduped.append(a)

    db.query(ReservationVehicle).filter(ReservationVehicle.reservation_id == r.id).delete()
    for i, a in enumerate(deduped):
        db.add(ReservationVehicle(
            reservation_id=r.id,
            vehicle_id=a.get("vehicle_id"),
            driver_id=a.get("driver_id"),
            owner_driver_id=a.get("owner_driver_id"),
            display_order=i,
        ))
    first = deduped[0] if deduped else None
    r.vehicle_id = first.get("vehicle_id") if first else None
    r.driver_id = first.get("driver_id") if first else None
    r.owner_driver_id = first.get("owner_driver_id") if first else None
    # This session has autoflush=False (app/database.py) — flush explicitly so
    # a get_reservation_vehicles() call later in the same request (timeline
    # auto-create/sync) sees these rows instead of the pre-update state.
    db.flush()

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
    status: Optional[str] = Query(None),
    event_category: Optional[str] = Query(None),
    vehicle_category: Optional[str] = Query(None),
    vehicle_id: Optional[int] = Query(None),
    contact_id: Optional[int] = Query(None),
    location_id: Optional[int] = Query(None),
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
         .outerjoin(Contact, Reservation.contact_id == Contact.id)
         .options(contains_eager(Reservation.contact), selectinload(Reservation.timelines)))

    if status:
        statuses = [ReservationStatus(s) for s in status.split(",") if s]
        q = q.filter(Reservation.status.in_(statuses))
    else:
        # Cancelled reservations are hidden from the default/unfiltered view —
        # still reachable via the explicit "Canceladas" status filter.
        q = q.filter(Reservation.status != ReservationStatus.cancelled)
    if event_category:
        q = q.filter(Reservation.event_category.in_(event_category.split(",")))
    if vehicle_category:
        # Matches ANY vehicle on the reservation, not just the primary one —
        # same reasoning as the vehicle_id filter below.
        categories = [VehicleCategory(c) for c in vehicle_category.split(",") if c]
        q = q.filter(Reservation.id.in_(
            db.query(ReservationVehicle.reservation_id)
            .join(Vehicle, ReservationVehicle.vehicle_id == Vehicle.id)
            .filter(Vehicle.category.in_(categories))
        ))
    if vehicle_id:
        # Matches ANY vehicle on the reservation, not just the primary one —
        # a reservation with a second vehicle should still show up here.
        q = q.filter(Reservation.id.in_(
            db.query(ReservationVehicle.reservation_id).filter(ReservationVehicle.vehicle_id == vehicle_id)
        ))
    if contact_id:
        q = q.filter(Reservation.contact_id == contact_id)
    if location_id:
        loc = db.get(CatalogLocation, location_id)
        if loc:
            q = (q.join(EventTimeline, EventTimeline.reservation_id == Reservation.id)
                  .join(EventLocation, EventLocation.timeline_id == EventTimeline.id)
                  .filter(func.lower(EventLocation.location_name) == loc.name.strip().lower())
                  .distinct())
        else:
            q = q.filter(Reservation.id.is_(None))  # no such location → empty result
    if date_from:
        # Widened, not an exact >= date_from: a multi-day event can start
        # before date_from and still be ongoing during it — the precise
        # overlap check (via effective_end_date) happens after fetching,
        # once each reservation's timeline activities are available.
        q = q.filter(Reservation.event_date >= date_from - timedelta(days=MULTI_DAY_LOOKBACK_DAYS))
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
            Contact.full_name.ilike(pat),
            Contact.phone.ilike(pat),
        ))

    col = _SORT_COLS.get(sort_by, Reservation.event_date)
    q = q.order_by(desc(col) if sort_dir == "desc" else asc(col))

    if date_from:
        # The SQL filter above only widened the lower bound — apply the exact
        # overlap check here, then paginate the already-filtered list (can't
        # paginate at the SQL level before this, or the count/offset would be
        # wrong relative to the precise, non-widened result).
        all_items = q.all()
        timeline_ids = [tl.id for r in all_items for tl in (r.timelines or [])]
        activities_by_timeline: dict[int, list] = {}
        if timeline_ids:
            for a in db.query(TimelineActivity).filter(TimelineActivity.timeline_id.in_(timeline_ids)).all():
                activities_by_timeline.setdefault(a.timeline_id, []).append(a)

        def _overlaps_range(r: Reservation) -> bool:
            tls = r.timelines or []
            activities = activities_by_timeline.get(tls[0].id, []) if tls else []
            return effective_end_date(r.event_date, activities) >= date_from

        filtered = [r for r in all_items if _overlaps_range(r)]
        total = len(filtered)
        start = (page - 1) * page_size
        items = filtered[start:start + page_size]
    else:
        total = q.count()
        items = q.offset((page - 1) * page_size).limit(page_size).all()

    return ReservationPage(
        items=[ReservationList.build(r, db) for r in items],
        total=total,
        page=page,
        page_size=page_size,
        pages=max(1, -(-total // page_size)),
    )


@router.post("/api/reservations", response_model=ReservationRead, status_code=201, dependencies=[Depends(get_current_user)])
def create_reservation(body: ReservationCreate, db: Session = Depends(get_db)):
    assignments = _resolve_vehicle_assignments(
        [v.model_dump() for v in body.vehicles] if body.vehicles is not None else None,
        body.vehicle_id, body.driver_id, body.owner_driver_id,
    )
    vehicle_ids = [a["vehicle_id"] for a in assignments if a.get("vehicle_id")]
    driver_ids = [a["driver_id"] for a in assignments if a.get("driver_id")]
    owner_driver_ids = [a["owner_driver_id"] for a in assignments if a.get("owner_driver_id")]
    blocking = [c for c in find_conflicts(
        db, body.event_date, vehicle_ids, driver_ids, owner_driver_ids,
    ) if c["severity"] == "blocking"]
    if blocking:
        raise HTTPException(status_code=409, detail={"conflicts": blocking})
    r = Reservation(**body.model_dump(exclude={"vehicles"}), reservation_number=_next_number(db))
    db.add(r)
    db.flush()
    _set_reservation_vehicles(r, assignments, db)
    gcal_synced = _auto_create_timeline(r, db)
    db.commit()
    db.refresh(r)
    return ReservationRead.build(r, db, gcal_synced=gcal_synced)


def _timeline_vehicle_str(r: Reservation, db: Session) -> Optional[str]:
    """What to write into EventTimeline.assigned_vehicle. Single-vehicle
    reservations keep the exact old behavior (just the vehicle name — the
    driver already has its own assigned_driver field, pairing them here too
    would just duplicate it). Multi-vehicle reservations get the richer
    vehicle↔driver-paired string, since a single assigned_driver can no
    longer represent all of them."""
    rvs = get_reservation_vehicles(r.id, db)
    if len(rvs) > 1:
        s = display_vehicle_str(rvs)
        return s if s != "—" else None
    return r.display_vehicle if r.display_vehicle != "—" else None


def _auto_create_timeline(r: Reservation, db: Session) -> Optional[bool]:
    import uuid
    from app.models.event_timeline import EventTimeline
    from app.services.google_calendar_service import calendar_category_for

    customer = r.customer
    driver = r.driver

    event_name = (
        f"{customer.bride_name} & {customer.groom_name}"
        if customer and getattr(customer, "bride_name", None) and getattr(customer, "groom_name", None)
        else (customer.main_contact_name if customer else r.reservation_number)
    )

    tl = EventTimeline(
        reservation_id=r.id,
        event_name=event_name,
        event_date=r.event_date,
        main_contact_name=customer.main_contact_name if customer else None,
        main_contact_phone=customer.phone if customer else None,
        assigned_vehicle=_timeline_vehicle_str(r, db),
        assigned_driver=driver.full_name if driver else None,
        assigned_driver_phone=driver.phone if driver else None,
        special_instructions=r.special_instructions,
        calendar_category=calendar_category_for(r),
        share_token_driver=uuid.uuid4().hex,
        share_token_customer=uuid.uuid4().hex,
        share_token_ops=uuid.uuid4().hex,
    )
    db.add(tl)
    db.flush()
    from app.routers.timelines import _gcal_sync
    return _gcal_sync(tl, db, "auto on reservation create")


@router.get("/api/reservations/{reservation_id}", response_model=ReservationRead, dependencies=[Depends(get_current_user)])
def get_reservation(reservation_id: int, db: Session = Depends(get_db)):
    return ReservationRead.build(_get(reservation_id, db), db)


@router.put("/api/reservations/{reservation_id}", response_model=ReservationRead, dependencies=[Depends(get_current_user)])
def update_reservation(reservation_id: int, body: ReservationUpdate, db: Session = Depends(get_db)):
    r = _get(reservation_id, db)
    changed = body.model_dump(exclude_unset=True)
    new_vehicles_raw = changed.pop("vehicles", _UNSET)
    vehicles_touched = new_vehicles_raw is not _UNSET or bool(
        {"vehicle_id", "driver_id", "owner_driver_id"} & set(changed.keys())
    )

    # Resolve final assignments for the conflict check (prefer incoming,
    # fall back to current — a reservation always has ReservationVehicle
    # rows once it has any vehicle, thanks to the backfill migration).
    if new_vehicles_raw is not _UNSET:
        assignments = _resolve_vehicle_assignments(new_vehicles_raw, None, None, None)
    elif vehicles_touched:
        assignments = _resolve_vehicle_assignments(
            None,
            changed.get("vehicle_id", r.vehicle_id),
            changed.get("driver_id", r.driver_id),
            changed.get("owner_driver_id", r.owner_driver_id),
        )
    else:
        assignments = [
            {"vehicle_id": rv.vehicle_id, "driver_id": rv.driver_id, "owner_driver_id": rv.owner_driver_id}
            for rv in get_reservation_vehicles(reservation_id, db)
        ]

    chk_date = changed.get("event_date", r.event_date)
    vehicle_ids = [a["vehicle_id"] for a in assignments if a.get("vehicle_id")]
    driver_ids = [a["driver_id"] for a in assignments if a.get("driver_id")]
    owner_driver_ids = [a["owner_driver_id"] for a in assignments if a.get("owner_driver_id")]
    blocking = [c for c in find_conflicts(
        db, chk_date, vehicle_ids, driver_ids, owner_driver_ids, exclude_id=reservation_id,
    ) if c["severity"] == "blocking"]
    if blocking:
        raise HTTPException(status_code=409, detail={"conflicts": blocking})
    operational_fields = {"event_date", "vehicle_id", "driver_id", "owner_driver_id", "customer_id", "status", "event_category", "special_instructions"}
    needs_timeline_sync = bool(operational_fields & set(changed.keys())) or vehicles_touched
    for field, value in changed.items():
        setattr(r, field, value)

    if vehicles_touched:
        _set_reservation_vehicles(r, assignments, db)

    db.commit()
    db.refresh(r)

    gcal_synced = _sync_linked_timelines(r, db) if needs_timeline_sync else None

    return ReservationRead.build(r, db, gcal_synced=gcal_synced)


def _sync_linked_timelines(reservation, db) -> Optional[bool]:
    from app.models.event_timeline import EventTimeline
    from app.services.google_calendar_service import calendar_category_for
    from app.routers.timelines import _gcal_sync

    new_category = calendar_category_for(reservation)
    customer = reservation.customer
    driver = reservation.owner_driver if reservation.owner_driver_id else reservation.driver

    # NOT filtering out gcal_imported timelines here anymore — contact info
    # (below) is pure lookup data that's never pushed back to Google
    # Calendar, so it's safe to always keep in sync with the customer, even
    # for an imported timeline. Only the calendar-descriptive fields further
    # down stay frozen for imported timelines, same as before, so this app
    # never fights with a human-edited calendar event.
    linked = db.query(EventTimeline).filter(
        EventTimeline.reservation_id == reservation.id,
    ).all()
    results: list = []
    for tl in linked:
        if customer:
            bride = getattr(customer, 'bride_name', None)
            groom = getattr(customer, 'groom_name', None)
            tl.main_contact_name = f"{bride} & {groom}" if bride and groom else (customer.main_contact_name or bride or groom)
            tl.main_contact_phone = customer.phone

        if not tl.gcal_imported:
            tl.calendar_category = new_category
            tl.event_date = reservation.event_date
            display_v = _timeline_vehicle_str(reservation, db)
            if display_v:
                tl.assigned_vehicle = display_v
            display_name = reservation.display_customer
            if display_name and display_name != "—":
                tl.event_name = display_name
            if driver:
                tl.assigned_driver = driver.full_name
                tl.assigned_driver_phone = driver.phone or getattr(driver, 'whatsapp', None) or None
            elif reservation.driver_id is None and reservation.owner_driver_id is None:
                tl.assigned_driver = None
                tl.assigned_driver_phone = None
            if reservation.special_instructions:
                tl.special_instructions = reservation.special_instructions
        db.commit()
        results.append(_gcal_sync(tl, db, "on reservation change"))

    if not results:
        return None
    if any(res is False for res in results):
        return False
    if any(res is True for res in results):
        return True
    return None


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
    addons_total = quote.addons_total or Decimal("0")
    r = Reservation(
        reservation_number=_next_number(db),
        customer_id=quote.customer_id,
        quote_id=quote.id,
        vehicle_id=quote.vehicle_id,
        event_date=quote.event_date,
        total_amount=quote.total_price + addons_total,
        deposit_paid=quote.deposit_amount or 0,
        status=ReservationStatus.quoted,
        extra_hours=quote.extra_hours or 0,
        addon_package_ids=quote.addon_package_ids,
        addons_total=addons_total,
    )
    db.add(r)
    quote.status = "accepted"
    db.flush()
    _set_reservation_vehicles(r, _resolve_vehicle_assignments(None, quote.vehicle_id, None, None), db)
    gcal_synced = _auto_create_timeline(r, db)
    db.commit()
    db.refresh(r)
    return ReservationRead.build(r, db, gcal_synced=gcal_synced)


# ── Reservation Payments ──────────────────────────────────────────────────────

class PaymentCreate(BaseModel):
    amount: Decimal
    paid_at: date
    notes: Optional[str] = None
    payment_type: Literal["cash", "withholding"] = "cash"
    withholding_percentage: Optional[Decimal] = None


class PaymentRead(BaseModel):
    id: int
    reservation_id: int
    amount: Decimal
    paid_at: date
    notes: Optional[str]
    payment_type: str
    withholding_percentage: Optional[Decimal]
    created_at: datetime

    model_config = {"from_attributes": True}


def _sync_deposit(reservation: Reservation, db: Session) -> None:
    # Only "cash" payments count as deposit_paid — deposit_paid feeds the
    # finance dashboard's cash metrics, so a withholding entry (money that
    # never reached the company) must never inflate it. remaining_balance
    # separately accounts for withholding via Reservation.retention_total.
    total = sum(p.amount for p in reservation.payments if p.payment_type == "cash")
    reservation.deposit_paid = total
    db.commit()


@router.get("/api/reservations/{reservation_id}/payments", response_model=List[PaymentRead], dependencies=[Depends(get_current_user)])
def list_payments(reservation_id: int, db: Session = Depends(get_db)):
    r = db.query(Reservation).filter(Reservation.id == reservation_id).first()
    if not r:
        raise HTTPException(404, "Reserva no encontrada")
    return r.payments


@router.post("/api/reservations/{reservation_id}/payments", response_model=PaymentRead, status_code=201, dependencies=[Depends(get_current_user)])
def add_payment(reservation_id: int, body: PaymentCreate, db: Session = Depends(get_db)):
    r = db.query(Reservation).filter(Reservation.id == reservation_id).first()
    if not r:
        raise HTTPException(404, "Reserva no encontrada")
    payment = ReservationPayment(
        reservation_id=reservation_id,
        amount=body.amount,
        paid_at=body.paid_at,
        notes=body.notes,
        payment_type=body.payment_type,
        withholding_percentage=body.withholding_percentage,
    )
    db.add(payment)
    db.flush()
    db.refresh(r)
    _sync_deposit(r, db)
    _sync_linked_timelines(r, db)
    db.refresh(payment)
    return payment


@router.delete("/api/reservations/{reservation_id}/payments/{payment_id}", status_code=204, dependencies=[Depends(get_current_user)])
def delete_payment(reservation_id: int, payment_id: int, db: Session = Depends(get_db)):
    payment = db.query(ReservationPayment).filter(
        ReservationPayment.id == payment_id,
        ReservationPayment.reservation_id == reservation_id,
    ).first()
    if not payment:
        raise HTTPException(404, "Pago no encontrado")
    db.delete(payment)
    db.flush()
    r = db.query(Reservation).filter(Reservation.id == reservation_id).first()
    if r:
        db.refresh(r)
        _sync_deposit(r, db)
        _sync_linked_timelines(r, db)
