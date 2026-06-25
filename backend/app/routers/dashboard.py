from datetime import date, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, Query
from sqlalchemy import extract, func
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


@router.get("/api/dashboard/charts/revenue-trend")
def revenue_trend(
    months: int = Query(24, ge=1, le=60),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    today = date.today()
    # Go back `months` calendar months from the start of the current month
    cutoff_month = today.month - months % 12
    cutoff_year  = today.year - months // 12 - (1 if cutoff_month <= 0 else 0)
    if cutoff_month <= 0:
        cutoff_month += 12
    cutoff = date(cutoff_year, cutoff_month, 1)

    rows = (
        db.query(
            func.date_trunc("month", Reservation.event_date).label("month"),
            func.sum(Reservation.total_amount).label("revenue"),
            func.count(Reservation.id).label("count"),
        )
        .filter(
            Reservation.status == ReservationStatus.completed,
            Reservation.total_amount > 0,
            Reservation.event_date >= cutoff,
        )
        .group_by("month")
        .order_by("month")
        .all()
    )

    data = []
    for row in rows:
        rev = float(row.revenue or 0)
        data.append({
            "month": row.month.strftime("%Y-%m"),
            "revenue": rev,
            "company_share": round(rev * 0.30),
            "count": row.count,
        })

    return {"data": data}


@router.get("/api/dashboard/charts/analytics")
def analytics(
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    today = date.today()

    # ── 1. Conversion funnel (standard category only, all time) ──────────────
    STATUS_ORDER = [
        ReservationStatus.lead,
        ReservationStatus.quoted,
        ReservationStatus.deposit_received,
        ReservationStatus.reserved,
        ReservationStatus.confirmed,
        ReservationStatus.completed,
    ]
    STATUS_LABELS = {
        "lead": "Lead",
        "quoted": "Cotizado",
        "deposit_received": "Abono",
        "reserved": "Reservado",
        "confirmed": "Confirmado",
        "completed": "Completado",
    }
    funnel_rows = (
        db.query(Reservation.status, func.count(Reservation.id))
        .filter(Reservation.event_category == "standard")
        .group_by(Reservation.status)
        .all()
    )
    counts = {row[0]: row[1] for row in funnel_rows}
    funnel = []
    for i, s in enumerate(STATUS_ORDER):
        cnt = counts.get(s, 0)
        prev = counts.get(STATUS_ORDER[i - 1], 0) if i > 0 else None
        conv = round(cnt / prev * 100) if prev else None
        funnel.append({"status": s.value, "label": STATUS_LABELS[s.value], "count": cnt, "conversion": conv})

    # ── 2. Monthly bookings vs completions (last 12 months) ──────────────────
    twelve_ago_month = today.month - 11
    twelve_ago_year  = today.year - (1 if twelve_ago_month <= 0 else 0)
    if twelve_ago_month <= 0:
        twelve_ago_month += 12
    twelve_ago = date(twelve_ago_year, twelve_ago_month, 1)

    created_rows = (
        db.query(
            func.date_trunc("month", Reservation.created_at).label("month"),
            func.count(Reservation.id).label("created"),
        )
        .filter(Reservation.created_at >= twelve_ago)
        .group_by("month")
        .all()
    )
    completed_rows = (
        db.query(
            func.date_trunc("month", Reservation.event_date).label("month"),
            func.count(Reservation.id).label("completed"),
        )
        .filter(
            Reservation.status == ReservationStatus.completed,
            Reservation.event_date >= twelve_ago,
        )
        .group_by("month")
        .all()
    )

    # Merge by month key, fill all 12 months
    created_map  = {r.month.strftime("%Y-%m"): r.created   for r in created_rows}
    completed_map = {r.month.strftime("%Y-%m"): r.completed for r in completed_rows}
    all_months = []
    for i in range(12):
        m = today.month - 11 + i
        y = today.year
        if m <= 0:
            m += 12
            y -= 1
        elif m > 12:
            m -= 12
            y += 1
        key = f"{y}-{m:02d}"
        all_months.append({"month": key, "created": created_map.get(key, 0), "completed": completed_map.get(key, 0)})

    # ── 3. Category breakdown ────────────────────────────────────────────────
    cat_rows = (
        db.query(
            Reservation.event_category,
            func.count(Reservation.id).label("count"),
            func.sum(Reservation.total_amount).label("revenue"),
        )
        .group_by(Reservation.event_category)
        .all()
    )
    CATEGORY_LABELS = {"standard": "Estándar", "obsequio": "Obsequio", "publicidad": "Publicidad"}
    category_breakdown = [
        {
            "category": r.event_category,
            "label": CATEGORY_LABELS.get(r.event_category, r.event_category),
            "count": r.count,
            "revenue": float(r.revenue or 0),
        }
        for r in cat_rows
    ]

    # ── 4. Seasonality (all completed, by calendar month) ────────────────────
    MONTH_LABELS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]
    season_rows = (
        db.query(
            extract("month", Reservation.event_date).label("month_num"),
            func.count(Reservation.id).label("count"),
        )
        .filter(Reservation.status == ReservationStatus.completed)
        .group_by("month_num")
        .order_by("month_num")
        .all()
    )
    season_map = {int(r.month_num): r.count for r in season_rows}
    seasonality = [
        {"month": m, "label": MONTH_LABELS[m - 1], "count": season_map.get(m, 0)}
        for m in range(1, 13)
    ]

    return {
        "funnel": funnel,
        "monthly_bookings": all_months,
        "category_breakdown": category_breakdown,
        "seasonality": seasonality,
    }
