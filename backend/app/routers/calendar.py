from datetime import date, time
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, selectinload

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.reservation import Reservation
from app.models.event_timeline import EventTimeline
from app.models.vehicle_photo import VehiclePhoto
from app.services.conflicts import find_conflicts

router = APIRouter(tags=["calendar"], redirect_slashes=False)

_STATUS_COLOR = {
    "lead": "#9CA3AF",
    "quoted": "#60A5FA",
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

    # Reservations (with timeline presence)
    reservations = (
        db.query(Reservation)
        .filter(Reservation.event_date >= start, Reservation.event_date <= end)
        .filter(Reservation.status != "cancelled")
        .options(selectinload(Reservation.timelines))
        .all()
    )
    # Pre-fetch first visible photo per vehicle
    vehicle_ids = [r.vehicle_id for r in reservations if r.vehicle_id]
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
                photo_map[p.vehicle_id] = f"/api/uploads/vehicles/{p.file_name}"

    for r in reservations:
        customer = r.display_customer
        vehicle = r.display_vehicle
        driver = r.display_driver
        title_parts = [customer]
        if vehicle != "—":
            title_parts.append(vehicle)
        has_timeline = bool(r.timelines)
        events.append({
            "id": f"res-{r.id}",
            "type": "reservation",
            "source_id": r.id,
            "title": " · ".join(title_parts),
            "subtitle": driver if driver != "—" else None,
            "vehicle": vehicle if vehicle != "—" else None,
            "date": str(r.event_date),
            "status": r.status,
            "color": _STATUS_COLOR.get(r.status, "#9CA3AF"),
            "vehicle_id": r.vehicle_id,
            "driver_id": r.driver_id,
            "has_timeline": has_timeline,
            "timeline_id": r.timelines[0].id if has_timeline else None,
            "start_time": r.start_time.strftime("%H:%M") if r.start_time else None,
            "end_time": r.end_time.strftime("%H:%M") if r.end_time else None,
            "vehicle_photo_url": photo_map.get(r.vehicle_id) if r.vehicle_id else None,
            "vehicle_license_plate": r.vehicle.license_plate if r.vehicle else None,
            "owner_name": r.vehicle.owner_name if r.vehicle else None,
            "owner_whatsapp": r.vehicle.owner_contact if r.vehicle else None,
            "driver_phone": r.display_driver_phone,
        })

    # Timelines — only standalone ones (linked timelines are already shown via their reservation)
    timelines = (
        db.query(EventTimeline)
        .filter(EventTimeline.event_date >= start, EventTimeline.event_date <= end)
        .filter(EventTimeline.reservation_id.is_(None))
        .all()
    )
    for t in timelines:
        events.append({
            "id": f"tl-{t.id}",
            "type": "timeline",
            "source_id": t.id,
            "title": t.event_name,
            "subtitle": t.assigned_vehicle,
            "date": str(t.event_date),
            "status": "timeline",
            "color": "#FB923C",
            "vehicle_id": None,
            "driver_id": None,
        })

    return events


@router.get("/api/calendar/conflicts", dependencies=[Depends(get_current_user)])
def check_conflicts(
    event_date: date = Query(...),
    vehicle_id: Optional[int] = Query(None),
    driver_id: Optional[int] = Query(None),
    start_time: Optional[time] = Query(None),
    end_time: Optional[time] = Query(None),
    exclude_reservation_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    conflicts = find_conflicts(
        db,
        event_date=event_date,
        vehicle_id=vehicle_id,
        driver_id=driver_id,
        new_start=start_time,
        new_end=end_time,
        exclude_id=exclude_reservation_id,
    )
    return {"conflicts": conflicts, "has_conflicts": len(conflicts) > 0}
