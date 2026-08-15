from __future__ import annotations

from datetime import date, timedelta
from typing import Optional

from sqlalchemy.orm import Session, selectinload

from app.models.reservation import Reservation
from app.models.timeline_activity import TimelineActivity
from app.models.vehicle import Vehicle
from app.services.event_span import effective_end_date
from app.services.pico_y_placa import PICO_HOURS, WEEKDAY_ES, get_effective_pyp, is_festivo

BLOCKING_STATUSES = {"pre_reserved", "deposit_received", "reserved", "confirmed"}

# Multi-day events are rare (mostly ad/production shoots) and typically short —
# this lookback is generous enough to catch one that started before `event_date`
# and still spans into it, without scanning the whole table.
MULTI_DAY_LOOKBACK_DAYS = 14


def find_conflicts(
    db: Session,
    event_date: date,
    vehicle_id: Optional[int],
    driver_id: Optional[int],
    exclude_id: Optional[int] = None,
) -> list[dict]:
    """
    Return conflict dicts for vehicle/driver on event_date.

    Reservations no longer carry a time window, so any same-vehicle or
    same-driver match on the same day is always a hard block — there's no
    signal left to distinguish a real overlap from a same-day-different-time
    booking.
    """
    base = db.query(Reservation).filter(
        Reservation.event_date >= event_date - timedelta(days=MULTI_DAY_LOOKBACK_DAYS),
        Reservation.event_date <= event_date,
        Reservation.status.in_(BLOCKING_STATUSES),
    ).options(selectinload(Reservation.timelines))
    if exclude_id:
        base = base.filter(Reservation.id != exclude_id)

    candidates_raw = base.all()

    # EventTimeline.activities (the ORM relationship) doesn't reliably behave
    # as a list here — same workaround used everywhere else in the codebase
    # (e.g. owner_settlements.py, timelines.py): query TimelineActivity directly.
    timeline_ids = [r.timelines[0].id for r in candidates_raw if r.timelines]
    activities_by_timeline: dict[int, list] = {}
    if timeline_ids:
        for a in db.query(TimelineActivity).filter(TimelineActivity.timeline_id.in_(timeline_ids)).all():
            activities_by_timeline.setdefault(a.timeline_id, []).append(a)

    def _spans_target(r: Reservation) -> bool:
        if r.event_date == event_date:
            return True
        activities = activities_by_timeline.get(r.timelines[0].id, []) if r.timelines else []
        return effective_end_date(r.event_date, activities) >= event_date

    candidates = [r for r in candidates_raw if _spans_target(r)]

    conflicts = []

    if vehicle_id:
        clashes = [r for r in candidates if r.vehicle_id == vehicle_id]
        for clash in clashes:
            if clash.event_date != event_date:
                msg = (
                    f"El vehículo está ocupado por un evento de varios días "
                    f"({clash.reservation_number} — {clash.display_customer})"
                )
            else:
                msg = (
                    f"El vehículo ya está reservado ese día "
                    f"({clash.reservation_number} — {clash.display_customer})"
                )
            conflicts.append({
                "type": "vehicle",
                "severity": "blocking",
                "reservation_number": clash.reservation_number,
                "message": msg,
            })

    if driver_id:
        clashes = [r for r in candidates if r.driver_id == driver_id]
        for clash in clashes:
            if clash.event_date != event_date:
                msg = (
                    f"El conductor está ocupado por un evento de varios días "
                    f"({clash.reservation_number} — {clash.display_customer})"
                )
            else:
                msg = (
                    f"El conductor ya está asignado ese día "
                    f"({clash.reservation_number} — {clash.display_customer})"
                )
            conflicts.append({
                "type": "driver",
                "severity": "blocking",
                "reservation_number": clash.reservation_number,
                "message": msg,
            })

    if vehicle_id:
        vehicle = db.get(Vehicle, vehicle_id)
        if vehicle:
            pyp_day = get_effective_pyp(vehicle, event_date)
            if pyp_day and WEEKDAY_ES[event_date.weekday()] == pyp_day:
                if is_festivo(event_date):
                    msg = "Festivo — sin restricción de pico y placa ese día"
                else:
                    msg = f"El vehículo tiene pico y placa el {pyp_day} ({PICO_HOURS})"
                conflicts.append({
                    "type": "pico_y_placa",
                    "severity": "warning",
                    "reservation_number": "",
                    "message": msg,
                })

    return conflicts
