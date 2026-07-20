from datetime import date, timedelta
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import extract, func
from sqlalchemy.orm import Session

from app.core.dependencies import require_admin
from app.database import get_db
from app.models.owner_settlement import OwnerSettlement
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
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    today = date.today()

    # Resolve effective range
    eff_from = date_from
    eff_to = date_to

    # --- Upcoming reservations (always next 30 days — operational, not date-range-filtered) ---
    next_30 = today + timedelta(days=30)
    upcoming_filters = [
        Reservation.event_date >= today,
        Reservation.event_date <= next_30,
        Reservation.status.notin_(["cancelled", "completed"]),
    ]

    upcoming_qs = (
        db.query(Reservation)
        .filter(*upcoming_filters)
        .order_by(Reservation.event_date)
        .limit(10)
        .all()
    )

    def _vehicle_photo_url(reservation) -> str | None:
        v = reservation.vehicle
        if not v:
            return None
        photos = v.photos if isinstance(v.photos, list) else ([v.photos] if v.photos else [])
        first = next((p for p in photos if p.is_visible), None)
        return f"/api/uploads/vehicles/{first.file_name}" if first else None

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
            "vehicle_photo_url": _vehicle_photo_url(r),
            "vehicle_is_company_owned": r.vehicle.is_company_owned if r.vehicle else False,
            "vehicle_license_plate": r.vehicle.license_plate if r.vehicle else None,
            "owner_name": r.vehicle.owner_name if r.vehicle else None,
            "owner_whatsapp": r.vehicle.owner_contact if r.vehicle else None,
            "driver_phone": r.display_driver_phone,
        })

    # --- Reservations by status (always all-time snapshot) ---
    status_rows = db.query(Reservation.status, func.count()).group_by(Reservation.status).all()
    by_status = {s.value: 0 for s in ReservationStatus}
    for status, cnt in status_rows:
        by_status[status] = cnt

    # --- Finance: date-range-filtered ---
    # Resolve defaults: "this month" when no range specified
    fin_from = eff_from or today.replace(day=1)
    fin_to   = eff_to or today

    period_res = (
        db.query(Reservation)
        .filter(
            Reservation.event_date >= fin_from,
            Reservation.event_date <= fin_to,
        )
        .all()
    )
    completed_in_period = [r for r in period_res if r.status == ReservationStatus.completed]

    revenue_in_period = sum(r.total_amount for r in completed_in_period) or Decimal("0")
    company_revenue_in_period = sum(
        r.total_amount if (r.vehicle and r.vehicle.is_company_owned) else r.total_amount * Decimal("0.30")
        for r in completed_in_period
    ) or Decimal("0")

    active_in_period = [r for r in period_res if r.status in ACTIVE_STATUSES]
    pending_collections = sum(r.remaining_balance for r in active_in_period) or Decimal("0")
    company_pending_collections = sum(
        r.remaining_balance if (r.vehicle and r.vehicle.is_company_owned) else r.remaining_balance * Decimal("0.30")
        for r in active_in_period
    ) or Decimal("0")

    paid_reservation_ids = {
        row[0] for row in db.query(OwnerSettlement.reservation_id)
        .filter(OwnerSettlement.status == "paid")
        .all()
    }
    unsettled_completed = [
        r for r in completed_in_period
        if r.id not in paid_reservation_ids
    ]
    pending_owner_payments = sum(
        Decimal("0") if (r.vehicle and r.vehicle.is_company_owned) else r.total_amount * Decimal("0.70")
        for r in unsettled_completed
    ) or Decimal("0")
    pending_company_revenue = sum(
        r.total_amount if (r.vehicle and r.vehicle.is_company_owned) else r.total_amount * Decimal("0.30")
        for r in unsettled_completed
    ) or Decimal("0")

    # --- Vehicles by status (always all-time snapshot) ---
    vehicle_rows = db.query(Vehicle.status, func.count()).group_by(Vehicle.status).all()
    vehicles_by_status: dict = {}
    for status, cnt in vehicle_rows:
        vehicles_by_status[status if isinstance(status, str) else status.value] = cnt

    # --- Period events table (all reservations in the date range, sorted by date) ---
    period_events = sorted(period_res, key=lambda r: r.event_date)
    period_events_data = [
        {
            "id": r.id,
            "reservation_number": r.reservation_number,
            "title": r.display_customer,
            "date": r.event_date.isoformat(),
            "status": r.status,
            "vehicle": r.display_vehicle,
            "driver": r.display_driver,
            "total_amount": float(r.total_amount),
            "remaining_balance": float(r.remaining_balance),
            "vehicle_photo_url": _vehicle_photo_url(r),
            "vehicle_is_company_owned": r.vehicle.is_company_owned if r.vehicle else False,
            "vehicle_license_plate": r.vehicle.license_plate if r.vehicle else None,
            "owner_name": r.vehicle.owner_name if r.vehicle else None,
            "owner_whatsapp": r.vehicle.owner_contact if r.vehicle else None,
            "driver_phone": r.display_driver_phone,
        }
        for r in period_events
    ]

    return {
        "upcoming": upcoming,
        "period_events": period_events_data,
        "reservations_by_status": by_status,
        "vehicles_by_status": vehicles_by_status,
        "finance": {
            "revenue_this_month": float(revenue_in_period),
            "company_revenue_this_month": float(company_revenue_in_period),
            "pending_collections": float(pending_collections),
            "company_pending_collections": float(company_pending_collections),
            "pending_owner_payments": float(pending_owner_payments),
            "pending_company_revenue": float(pending_company_revenue),
        },
    }


@router.get("/api/dashboard/charts/revenue-trend")
def revenue_trend(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    months: int = Query(24, ge=1, le=60),
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    today = date.today()

    base_filters = [
        Reservation.status == ReservationStatus.completed,
        Reservation.total_amount > 0,
    ]
    if date_from:
        base_filters.append(Reservation.event_date >= date_from)
    elif not date_to:
        cutoff_month = today.month - months % 12
        cutoff_year  = today.year - months // 12 - (1 if cutoff_month <= 0 else 0)
        if cutoff_month <= 0:
            cutoff_month += 12
        base_filters.append(Reservation.event_date >= date(cutoff_year, cutoff_month, 1))
    if date_to:
        base_filters.append(Reservation.event_date <= date_to)

    rows = (
        db.query(Reservation, Vehicle)
        .outerjoin(Vehicle, Reservation.vehicle_id == Vehicle.id)
        .filter(*base_filters)
        .all()
    )

    monthly: dict = {}
    for r, v in rows:
        key = r.event_date.strftime("%Y-%m")
        if key not in monthly:
            monthly[key] = {"revenue": 0.0, "company_share": 0.0, "count": 0}
        rev = float(r.total_amount)
        monthly[key]["revenue"] += rev
        monthly[key]["company_share"] += rev if (v and v.is_company_owned) else rev * 0.30
        monthly[key]["count"] += 1

    data = [
        {
            "month": k,
            "revenue": round(v["revenue"]),
            "company_share": round(v["company_share"]),
            "count": v["count"],
        }
        for k, v in sorted(monthly.items())
    ]
    return {"data": data}


@router.get("/api/dashboard/charts/analytics")
def analytics(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    today = date.today()

    # Build reusable date filter fragments
    def date_range_filters(date_col):
        f = []
        if date_from:
            f.append(date_col >= date_from)
        if date_to:
            f.append(date_col <= date_to)
        return f

    # ── 1. Conversion funnel ─────────────────────────────────────────────────
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
        .filter(
            Reservation.event_category == "standard",
            *date_range_filters(Reservation.event_date),
        )
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

    # ── 2. Monthly bookings vs completions ───────────────────────────────────
    if date_from or date_to:
        range_from = date_from
        range_to   = date_to
    else:
        # Default: last 12 months
        twelve_ago_month = today.month - 11
        twelve_ago_year  = today.year - (1 if twelve_ago_month <= 0 else 0)
        if twelve_ago_month <= 0:
            twelve_ago_month += 12
        range_from = date(twelve_ago_year, twelve_ago_month, 1)
        range_to   = today

    created_filters = []
    completed_filters = [Reservation.status == ReservationStatus.completed]
    if range_from:
        created_filters.append(Reservation.event_date >= range_from)
        completed_filters.append(Reservation.event_date >= range_from)
    if range_to:
        created_filters.append(Reservation.event_date <= range_to)
        completed_filters.append(Reservation.event_date <= range_to)

    created_rows = (
        db.query(
            func.date_trunc("month", Reservation.event_date).label("month"),
            func.count(Reservation.id).label("created"),
        )
        .filter(*created_filters)
        .group_by("month")
        .all()
    )
    completed_rows = (
        db.query(
            func.date_trunc("month", Reservation.event_date).label("month"),
            func.count(Reservation.id).label("completed"),
        )
        .filter(*completed_filters)
        .group_by("month")
        .all()
    )

    created_map   = {r.month.strftime("%Y-%m"): r.created   for r in created_rows}
    completed_map = {r.month.strftime("%Y-%m"): r.completed for r in completed_rows}

    # Build month list spanning the range
    all_month_keys = sorted(set(list(created_map.keys()) + list(completed_map.keys())))
    all_months = [
        {"month": key, "created": created_map.get(key, 0), "completed": completed_map.get(key, 0)}
        for key in all_month_keys
    ]

    # ── 3. Category breakdown ────────────────────────────────────────────────
    cat_rows = (
        db.query(
            Reservation.event_category,
            func.count(Reservation.id).label("count"),
            func.sum(Reservation.total_amount).label("revenue"),
        )
        .filter(*date_range_filters(Reservation.event_date))
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

    # ── 4. Seasonality ───────────────────────────────────────────────────────
    MONTH_LABELS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]
    season_rows = (
        db.query(
            extract("month", Reservation.event_date).label("month_num"),
            func.count(Reservation.id).label("count"),
        )
        .filter(
            Reservation.status == ReservationStatus.completed,
            *date_range_filters(Reservation.event_date),
        )
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


@router.get("/api/dashboard/charts/vehicles")
def vehicle_usage(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    vehicle_ids: Optional[str] = Query(None),  # comma-separated ints
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    today = date.today()

    parsed_ids: Optional[List[int]] = None
    if vehicle_ids:
        try:
            parsed_ids = [int(x.strip()) for x in vehicle_ids.split(",") if x.strip()]
        except ValueError:
            parsed_ids = None

    # Base filters
    base_filters = [
        Reservation.vehicle_id.isnot(None),
        Reservation.status != ReservationStatus.cancelled,
    ]
    if date_from:
        base_filters.append(Reservation.event_date >= date_from)
    if date_to:
        base_filters.append(Reservation.event_date <= date_to)
    if parsed_ids:
        base_filters.append(Reservation.vehicle_id.in_(parsed_ids))

    # Total events per vehicle (non-cancelled)
    res_rows = (
        db.query(
            Reservation.vehicle_id,
            func.count(Reservation.id).label("event_count"),
        )
        .filter(*base_filters)
        .group_by(Reservation.vehicle_id)
        .all()
    )

    # Completed stats per vehicle
    completed_rows = (
        db.query(
            Reservation.vehicle_id,
            func.count(Reservation.id).label("cnt"),
            func.coalesce(func.sum(Reservation.total_amount), 0).label("revenue"),
        )
        .filter(
            Reservation.vehicle_id.isnot(None),
            Reservation.status == ReservationStatus.completed,
            *([Reservation.event_date >= date_from] if date_from else []),
            *([Reservation.event_date <= date_to] if date_to else []),
            *([Reservation.vehicle_id.in_(parsed_ids)] if parsed_ids else []),
        )
        .group_by(Reservation.vehicle_id)
        .all()
    )
    completed_map = {r.vehicle_id: (r.cnt, float(r.revenue)) for r in completed_rows}

    # Last historical event and next upcoming per vehicle (all time, not filtered)
    past_rows = (
        db.query(Reservation.vehicle_id, func.max(Reservation.event_date).label("last_date"))
        .filter(Reservation.vehicle_id.isnot(None), Reservation.event_date <= today)
        .group_by(Reservation.vehicle_id)
        .all()
    )
    next_rows = (
        db.query(Reservation.vehicle_id, func.min(Reservation.event_date).label("next_date"))
        .filter(
            Reservation.vehicle_id.isnot(None),
            Reservation.event_date > today,
            Reservation.status.notin_([ReservationStatus.cancelled]),
        )
        .group_by(Reservation.vehicle_id)
        .all()
    )
    last_map = {r.vehicle_id: r.last_date for r in past_rows}
    next_map = {r.vehicle_id: r.next_date for r in next_rows}

    # Build vehicle id set
    vehicle_id_set = {r.vehicle_id for r in res_rows}

    # Fetch vehicles
    veh_query = db.query(Vehicle)
    if vehicle_id_set:
        veh_query = veh_query.filter(Vehicle.id.in_(vehicle_id_set))
    vehicles_map = {v.id: v for v in veh_query.all()}

    def _photo_url(vehicle: Vehicle) -> Optional[str]:
        if not vehicle:
            return None
        photos = vehicle.photos if isinstance(vehicle.photos, list) else ([vehicle.photos] if vehicle.photos else [])
        first = next((p for p in photos if p.is_visible), None)
        return f"/api/uploads/vehicles/{first.file_name}" if first else None

    result = []
    for row in res_rows:
        v = vehicles_map.get(row.vehicle_id)
        if not v:
            continue
        display_parts = [v.brand or ""]
        if v.color:
            display_parts.append(v.color)
        display_name = " ".join(p for p in display_parts if p).strip() or v.license_plate

        completed, rev = completed_map.get(row.vehicle_id, (0, 0.0))
        last_date = last_map.get(row.vehicle_id)
        next_date = next_map.get(row.vehicle_id)
        result.append({
            "id": v.id,
            "display_name": display_name,
            "license_plate": v.license_plate,
            "photo_url": _photo_url(v),
            "owner_name": v.owner_name,
            "owner_whatsapp": v.owner_contact,
            "event_count": row.event_count,
            "completed_count": completed,
            "total_revenue": rev,
            "company_share": round(rev) if v.is_company_owned else round(rev * 0.30),
            "avg_revenue": round(rev / completed) if completed else 0,
            "last_event_date": last_date.isoformat() if last_date else None,
            "next_event_date": next_date.isoformat() if next_date else None,
        })

    result.sort(key=lambda x: x["completed_count"], reverse=True)
    return {"vehicles": result}


@router.get("/api/dashboard/charts/weddings-by-year")
def weddings_by_year(
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    """
    Full history, independent of any date-range filter — the point is to
    compare year over year, so it always shows every year on record.
    """
    rows = (
        db.query(
            extract("year", Reservation.event_date).label("year"),
            func.count(Reservation.id).label("count"),
        )
        .filter(
            Reservation.event_category == "standard",
            Reservation.status != ReservationStatus.cancelled,
        )
        .group_by("year")
        .order_by("year")
        .all()
    )
    return {"data": [{"year": int(r.year), "count": r.count} for r in rows]}
