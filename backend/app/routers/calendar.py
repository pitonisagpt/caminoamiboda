from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, selectinload

from app.core.dependencies import get_current_user
from app.core.urls import build_upload_url
from app.database import get_db
from app.models.reservation import Reservation
from app.models.reservation_vehicle import ReservationVehicle
from app.models.event_timeline import EventTimeline
from app.models.timeline_activity import TimelineActivity
from app.models.vehicle_photo import VehiclePhoto
from app.services.conflicts import find_conflicts
from app.services.event_span import MULTI_DAY_LOOKBACK_DAYS, effective_end_date
from app.services.reservation_vehicles import rv_display_driver, rv_display_driver_phone, vehicle_display_name

router = APIRouter(tags=["calendar"], redirect_slashes=False)


def _activities_by_timeline(db: Session, timeline_ids: list[int]) -> dict[int, list]:
    # EventTimeline.activities (the ORM relationship) doesn't reliably behave
    # as a list here — same workaround used everywhere else in the codebase
    # (e.g. owner_settlements.py, timelines.py): query TimelineActivity directly.
    if not timeline_ids:
        return {}
    by_timeline: dict[int, list] = {}
    for a in db.query(TimelineActivity).filter(TimelineActivity.timeline_id.in_(timeline_ids)).all():
        by_timeline.setdefault(a.timeline_id, []).append(a)
    return by_timeline


_STATUS_COLOR = {
    "lead": "#9CA3AF",
    "quoted": "#60A5FA",
    "pre_reserved": "#2DD4BF",
    "deposit_received": "#FBBF24",
    "reserved": "#A78BFA",
    "confirmed": "#F472B6",
    "completed": "#34D399",
    "cancelled": "#F87171",
}


@router.get("/api/calendar/events", dependencies=[Depends(get_current_user)])
def calendar_events(
    start: date = Query(...),
    end: date = Query(...),
    db: Session = Depends(get_db),
):
    events = []

    # Reservations (with timeline presence). The lower bound is widened by
    # MULTI_DAY_LOOKBACK_DAYS to catch multi-day events that started before
    # `start` but still span into the visible range — filtered precisely
    # against each reservation's real end date below.
    reservations = (
        db.query(Reservation)
        .filter(Reservation.event_date >= start - timedelta(days=MULTI_DAY_LOOKBACK_DAYS))
        .filter(Reservation.event_date <= end)
        .filter(Reservation.status != "cancelled")
        .options(selectinload(Reservation.timelines))
        .all()
    )
    res_activities = _activities_by_timeline(db, [r.timelines[0].id for r in reservations if r.timelines])
    reservations = [
        r for r in reservations
        if effective_end_date(r.event_date, res_activities.get(r.timelines[0].id, []) if r.timelines else []) >= start
    ]
    # Bulk-fetch every vehicle+driver assignment per reservation — one extra
    # query for the whole visible range, not one per reservation. Mirrors the
    # photo_map pattern just below.
    reservation_ids = [r.id for r in reservations]
    vehicles_by_reservation: dict[int, list[ReservationVehicle]] = {}
    if reservation_ids:
        for rv in (
            db.query(ReservationVehicle)
            .filter(ReservationVehicle.reservation_id.in_(reservation_ids))
            .order_by(ReservationVehicle.display_order)
            .all()
        ):
            vehicles_by_reservation.setdefault(rv.reservation_id, []).append(rv)

    # Pre-fetch first visible photo per vehicle
    vehicle_ids = list({
        rv.vehicle_id for rvs in vehicles_by_reservation.values() for rv in rvs if rv.vehicle_id
    })
    photo_map: dict[int, str] = {}
    if vehicle_ids:
        photos = (
            db.query(VehiclePhoto)
            .filter(VehiclePhoto.vehicle_id.in_(vehicle_ids), VehiclePhoto.is_visible == True)  # noqa: E712
            .order_by(VehiclePhoto.display_order)
            .all()
        )
        for p in photos:
            if p.vehicle_id not in photo_map:
                photo_map[p.vehicle_id] = build_upload_url(f"/api/uploads/vehicles/{p.file_name}")

    for r in reservations:
        customer = r.display_customer
        vehicle = r.display_vehicle
        driver = r.display_driver
        title_parts = [customer]
        if vehicle != "—":
            title_parts.append(vehicle)
        has_timeline = bool(r.timelines)
        end_date = effective_end_date(r.event_date, res_activities.get(r.timelines[0].id, []) if has_timeline else [])
        # Structured multi-vehicle array — additive alongside the singular
        # vehicle_id/vehicle_photo_url/etc. fields below, which stay synced to
        # the primary (first) vehicle so existing consumers keep working.
        vehicles = []
        for rv in vehicles_by_reservation.get(r.id, []):
            v = rv.vehicle
            if not v:
                continue
            vehicles.append({
                "id": v.id,
                "display_name": vehicle_display_name(v),
                "license_plate": v.license_plate,
                "photo_url": photo_map.get(v.id),
                "owner_name": v.owner_name,
                "owner_whatsapp": v.owner_contact,
                "driver_id": rv.driver_id,
                "owner_driver_id": rv.owner_driver_id,
                "display_driver": rv_display_driver(rv),
                "display_driver_phone": rv_display_driver_phone(rv),
            })
        events.append({
            "id": f"res-{r.id}",
            "type": "reservation",
            "source_id": r.id,
            "title": " · ".join(title_parts),
            "subtitle": driver if driver != "—" else None,
            "vehicle": vehicle if vehicle != "—" else None,
            "date": str(r.event_date),
            "end_date": str(end_date),
            "status": r.status,
            "color": _STATUS_COLOR.get(r.status, "#9CA3AF"),
            "vehicle_id": r.vehicle_id,
            "driver_id": r.driver_id,
            "has_timeline": has_timeline,
            "timeline_id": r.timelines[0].id if has_timeline else None,
            "vehicle_photo_url": photo_map.get(r.vehicle_id) if r.vehicle_id else None,
            "vehicle_license_plate": r.vehicle.license_plate if r.vehicle else None,
            "owner_name": r.vehicle.owner_name if r.vehicle else None,
            "owner_whatsapp": r.vehicle.owner_contact if r.vehicle else None,
            "driver_phone": r.display_driver_phone,
            "vehicles": vehicles,
        })

    # Timelines — only standalone ones (linked timelines are already shown via their reservation)
    timelines = (
        db.query(EventTimeline)
        .filter(EventTimeline.event_date >= start - timedelta(days=MULTI_DAY_LOOKBACK_DAYS))
        .filter(EventTimeline.event_date <= end)
        .filter(EventTimeline.reservation_id.is_(None))
        .all()
    )
    tl_activities = _activities_by_timeline(db, [t.id for t in timelines])
    timelines = [t for t in timelines if effective_end_date(t.event_date, tl_activities.get(t.id, [])) >= start]
    for t in timelines:
        events.append({
            "id": f"tl-{t.id}",
            "type": "timeline",
            "source_id": t.id,
            "title": t.event_name,
            "subtitle": t.assigned_vehicle,
            "date": str(t.event_date),
            "end_date": str(effective_end_date(t.event_date, tl_activities.get(t.id, []))),
            "status": "timeline",
            "color": "#FB923C",
            "vehicle_id": None,
            "driver_id": None,
            "vehicles": [],
        })

    return events


def _parse_id_list(raw: Optional[str]) -> list[int]:
    """Comma-separated ids from a query param — not FastAPI's native
    `List[int] = Query([])`, since axios (no custom paramsSerializer here)
    serializes arrays as `vehicle_ids[]=1&vehicle_ids[]=2`, which FastAPI
    doesn't parse the same as repeated keys. A plain comma-separated string
    sidesteps the mismatch entirely."""
    return [int(x) for x in raw.split(",") if x.strip()] if raw else []


@router.get("/api/calendar/conflicts", dependencies=[Depends(get_current_user)])
def check_conflicts(
    event_date: date = Query(...),
    vehicle_ids: Optional[str] = Query(None),
    driver_ids: Optional[str] = Query(None),
    owner_driver_ids: Optional[str] = Query(None),
    exclude_reservation_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    conflicts = find_conflicts(
        db,
        event_date=event_date,
        vehicle_ids=_parse_id_list(vehicle_ids),
        driver_ids=_parse_id_list(driver_ids),
        owner_driver_ids=_parse_id_list(owner_driver_ids),
        exclude_id=exclude_reservation_id,
    )
    return {"conflicts": conflicts, "has_conflicts": len(conflicts) > 0}
