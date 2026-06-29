from datetime import date, timedelta
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.dependencies import require_admin
from app.database import get_db
from app.models.owner_settlement import OwnerSettlement
from app.models.reservation import Reservation, ReservationStatus
from app.models.vehicle import Vehicle

router = APIRouter(prefix="/api/finance", tags=["finance"], redirect_slashes=False)

ACTIVE_STATUSES = {
    ReservationStatus.lead,
    ReservationStatus.quoted,
    ReservationStatus.deposit_received,
    ReservationStatus.reserved,
    ReservationStatus.confirmed,
}


@router.get("/summary", dependencies=[Depends(require_admin)])
def finance_summary(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: Session = Depends(get_db),
):
    today = date.today()
    current_year = today.year

    # Year-level revenue (always full years, ignores date range filter)
    def _year_revenue(year: int) -> float:
        result = db.query(func.coalesce(func.sum(Reservation.total_amount), 0)).filter(
            Reservation.status == ReservationStatus.completed,
            func.extract("year", Reservation.event_date) == year,
        ).scalar()
        return float(result or 0)

    revenue_this_year = _year_revenue(current_year)
    revenue_last_year = _year_revenue(current_year - 1)
    yoy_change_pct = (
        round((revenue_this_year - revenue_last_year) / revenue_last_year * 100, 1)
        if revenue_last_year > 0 else None
    )

    # Period-filtered metrics
    eff_from = date_from or today.replace(day=1)
    eff_to = date_to or today

    period_filters = [
        Reservation.event_date >= eff_from,
        Reservation.event_date <= eff_to,
    ]

    completed_period = (
        db.query(Reservation, Vehicle)
        .outerjoin(Vehicle, Reservation.vehicle_id == Vehicle.id)
        .filter(Reservation.status == ReservationStatus.completed, *period_filters)
        .all()
    )
    revenue_period = float(sum(r.total_amount for r, _ in completed_period) or 0)
    company_revenue_period = float(sum(
        r.total_amount if (v and v.is_company_owned) else r.total_amount * Decimal("0.30")
        for r, v in completed_period
    ) or 0)

    deposits_received_period = float(
        db.query(func.coalesce(func.sum(Reservation.deposit_paid), 0))
        .filter(
            Reservation.status != ReservationStatus.cancelled,
            *period_filters,
        )
        .scalar() or 0
    )

    # Outstanding balance (all-time, active reservations only)
    active_res = db.query(Reservation).filter(
        Reservation.status.in_(ACTIVE_STATUSES)
    ).all()
    outstanding_balance_total = float(
        sum(r.remaining_balance for r in active_res) or 0
    )

    # Pending owner payments (unsettled OwnerSettlements)
    pending_owner_payments = float(
        db.query(func.coalesce(func.sum(OwnerSettlement.owner_amount), 0))
        .filter(OwnerSettlement.status == "pending")
        .scalar() or 0
    )

    return {
        "revenue_this_year": revenue_this_year,
        "revenue_last_year": revenue_last_year,
        "yoy_change_pct": yoy_change_pct,
        "revenue_period": revenue_period,
        "company_revenue_period": round(company_revenue_period),
        "deposits_received_period": deposits_received_period,
        "outstanding_balance_total": outstanding_balance_total,
        "pending_owner_payments": pending_owner_payments,
    }


@router.get("/charts/owner-revenue", dependencies=[Depends(require_admin)])
def owner_revenue(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: Session = Depends(get_db),
):
    # Join reservations with vehicles to get owner_name
    query = (
        db.query(Reservation, Vehicle)
        .outerjoin(Vehicle, Reservation.vehicle_id == Vehicle.id)
        .filter(Reservation.status == ReservationStatus.completed)
    )
    if date_from:
        query = query.filter(Reservation.event_date >= date_from)
    if date_to:
        query = query.filter(Reservation.event_date <= date_to)

    rows = query.all()

    owner_map: dict = {}
    for reservation, vehicle in rows:
        is_company = vehicle.is_company_owned if vehicle else False
        owner_name = (
            "Camino a mi Boda" if is_company
            else (vehicle.owner_name if vehicle and vehicle.owner_name else "Sin propietario")
        )
        if owner_name not in owner_map:
            owner_map[owner_name] = {"owner_name": owner_name, "completed_count": 0, "total_revenue": 0.0, "is_company": is_company}
        owner_map[owner_name]["completed_count"] += 1
        owner_map[owner_name]["total_revenue"] += float(reservation.total_amount)

    owners = []
    for entry in owner_map.values():
        rev = entry["total_revenue"]
        is_co = entry["is_company"]
        owners.append({
            "owner_name": entry["owner_name"],
            "completed_count": entry["completed_count"],
            "total_revenue": rev,
            "owner_amount": 0 if is_co else round(rev * 0.70),
            "company_amount": round(rev) if is_co else round(rev * 0.30),
        })

    owners.sort(key=lambda x: x["total_revenue"], reverse=True)
    return {"owners": owners}


@router.get("/charts/deposits", dependencies=[Depends(require_admin)])
def deposits_chart(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: Session = Depends(get_db),
):
    today = date.today()

    # Default: last 12 months
    if not date_from and not date_to:
        twelve_ago = today.replace(day=1)
        month = twelve_ago.month - 11
        year = twelve_ago.year
        if month <= 0:
            month += 12
            year -= 1
        eff_from = date(year, month, 1)
        eff_to = today
    else:
        eff_from = date_from
        eff_to = date_to

    filters = [Reservation.status != ReservationStatus.cancelled]
    if eff_from:
        filters.append(Reservation.event_date >= eff_from)
    if eff_to:
        filters.append(Reservation.event_date <= eff_to)

    rows = db.query(Reservation).filter(*filters).all()

    monthly: dict = {}
    for r in rows:
        key = r.event_date.strftime("%Y-%m")
        if key not in monthly:
            monthly[key] = {"month": key, "deposits_received": 0.0, "remaining_balance": 0.0}
        monthly[key]["deposits_received"] += float(r.deposit_paid)
        monthly[key]["remaining_balance"] += float(r.remaining_balance)

    data = sorted(
        [{"month": k, "deposits_received": round(v["deposits_received"]), "remaining_balance": round(v["remaining_balance"])}
         for k, v in monthly.items()],
        key=lambda x: x["month"],
    )
    return {"data": data}


@router.get("/aging", dependencies=[Depends(require_admin)])
def aging(db: Session = Depends(get_db)):
    today = date.today()

    rows = (
        db.query(Reservation)
        .filter(
            Reservation.status.notin_([ReservationStatus.cancelled, ReservationStatus.completed]),
        )
        .order_by(Reservation.event_date.asc())
        .all()
    )

    items = []
    for r in rows:
        rb = float(r.remaining_balance)
        if rb <= 0:
            continue
        days_to_event = (r.event_date - today).days
        items.append({
            "id": r.id,
            "reservation_number": r.reservation_number,
            "display_customer": r.display_customer,
            "event_date": r.event_date.isoformat(),
            "days_to_event": days_to_event,
            "total_amount": float(r.total_amount),
            "deposit_paid": float(r.deposit_paid),
            "remaining_balance": rb,
            "status": r.status if isinstance(r.status, str) else r.status.value,
        })

    return {"items": items}
