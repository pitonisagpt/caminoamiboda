from datetime import date, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.reservation import Reservation, ReservationStatus
from app.models.vehicle import Vehicle

router = APIRouter(tags=["dashboard"], redirect_slashes=False)

ACTIVE_STATUSES = {
    ReservationStatus.lead,
    ReservationStatus.quoted,
    ReservationStatus.deposit_received,
    ReservationStatus.reserved,
    ReservationStatus.confirmed,
}


@router.get("/api/dashboard/summary")
def get_summary(
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    today = date.today()
    month_start = today.replace(day=1)
    next_30 = today + timedelta(days=30)

    # --- Upcoming reservations (next 30 days, not cancelled/completed) ---
    upcoming_qs = (
        db.query(Reservation)
        .filter(
            Reservation.event_date >= today,
            Reservation.event_date <= next_30,
            Reservation.status.notin_(["cancelled", "completed"]),
        )
        .order_by(Reservation.event_date)
        .limit(10)
        .all()
    )

    upcoming = []
    for r in upcoming_qs:
        upcoming.append({
            "id": r.id,
            "reservation_number": r.reservation_number,
            "title": r.display_customer,
            "date": r.event_date.isoformat(),
            "status": r.status,
            "vehicle": r.display_vehicle,
            "driver": r.display_driver,
            "total_amount": float(r.total_amount),
            "remaining_balance": float(r.remaining_balance),
        })

    # --- Reservations by status (all time) ---
    status_rows = db.query(Reservation.status, func.count()).group_by(Reservation.status).all()
    by_status = {s.value: 0 for s in ReservationStatus}
    for status, cnt in status_rows:
        by_status[status] = cnt

    # --- Finance this month ---
    month_res = (
        db.query(Reservation)
        .filter(
            Reservation.event_date >= month_start,
            Reservation.event_date <= today,
        )
        .all()
    )
    revenue_this_month = sum(
        r.total_amount for r in month_res if r.status == ReservationStatus.completed
    ) or Decimal("0")
    pending_collections = sum(
        r.remaining_balance for r in (
            db.query(Reservation)
            .filter(Reservation.status.in_([s.value for s in ACTIVE_STATUSES]))
            .all()
        )
    ) or Decimal("0")
    pending_owner_payments = sum(
        r.total_amount * Decimal("0.70")
        for r in db.query(Reservation)
        .filter(Reservation.status == ReservationStatus.completed)
        .all()
    ) or Decimal("0")

    # --- Vehicles by status ---
    vehicle_rows = db.query(Vehicle.status, func.count()).group_by(Vehicle.status).all()
    vehicles_by_status: dict = {}
    for status, cnt in vehicle_rows:
        vehicles_by_status[status if isinstance(status, str) else status.value] = cnt

    return {
        "upcoming": upcoming,
        "reservations_by_status": by_status,
        "vehicles_by_status": vehicles_by_status,
        "finance": {
            "revenue_this_month": float(revenue_this_month),
            "pending_collections": float(pending_collections),
            "pending_owner_payments": float(pending_owner_payments),
        },
    }
