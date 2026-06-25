from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, selectinload

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.reservation import Reservation
from app.models.event_timeline import EventTimeline

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
            "date": str(r.event_date),
            "status": r.status,
            "color": _STATUS_COLOR.get(r.status, "#9CA3AF"),
            "vehicle_id": r.vehicle_id,
            "driver_id": r.driver_id,
            "has_timeline": has_timeline,
            "timeline_id": r.timelines[0].id if has_timeline else None,
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
    exclude_reservation_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    conflicts = []

    base = db.query(Reservation).filter(
        Reservation.event_date == event_date,
        Reservation.status.notin_(["cancelled", "lead"]),
    )
    if exclude_reservation_id:
        base = base.filter(Reservation.id != exclude_reservation_id)

    if vehicle_id:
        clash = base.filter(Reservation.vehicle_id == vehicle_id).first()
        if clash:
            conflicts.append({
                "type": "vehicle",
                "message": f"El vehículo ya está reservado ese día ({clash.reservation_number} — {clash.display_customer})",
            })

    if driver_id:
        clash = base.filter(Reservation.driver_id == driver_id).first()
        if clash:
            conflicts.append({
                "type": "driver",
                "message": f"El conductor ya está asignado ese día ({clash.reservation_number} — {clash.display_customer})",
            })

    return {"conflicts": conflicts, "has_conflicts": len(conflicts) > 0}
