from __future__ import annotations

from datetime import date, time
from typing import Optional

from sqlalchemy.orm import Session

from app.models.reservation import Reservation

BLOCKING_STATUSES = {"deposit_received", "reserved", "confirmed"}


def _times_overlap(a_start: time, a_end: time, b_start: time, b_end: time) -> bool:
    return a_start < b_end and b_start < a_end


def find_conflicts(
    db: Session,
    event_date: date,
    vehicle_id: Optional[int],
    driver_id: Optional[int],
    new_start: Optional[time] = None,
    new_end: Optional[time] = None,
    exclude_id: Optional[int] = None,
) -> list[dict]:
    """
    Return conflict dicts for vehicle/driver on event_date.

    severity="blocking"  → times confirmed to overlap → hard block
    severity="warning"   → same day but times unknown → soft warning only
    """
    base = db.query(Reservation).filter(
        Reservation.event_date == event_date,
        Reservation.status.in_(BLOCKING_STATUSES),
    )
    if exclude_id:
        base = base.filter(Reservation.id != exclude_id)

    conflicts = []

    if vehicle_id:
        clashes = base.filter(Reservation.vehicle_id == vehicle_id).all()
        for clash in clashes:
            if new_start and new_end and clash.start_time and clash.end_time:
                if not _times_overlap(new_start, new_end, clash.start_time, clash.end_time):
                    continue  # times don't actually overlap
                severity = "blocking"
                msg = (
                    f"El vehículo ya está reservado de {clash.start_time.strftime('%H:%M')} "
                    f"a {clash.end_time.strftime('%H:%M')} "
                    f"({clash.reservation_number} — {clash.display_customer})"
                )
            else:
                severity = "warning"
                msg = (
                    f"El vehículo tiene otro evento ese día "
                    f"({clash.reservation_number} — {clash.display_customer}) — verifica los horarios"
                )
            conflicts.append({
                "type": "vehicle",
                "severity": severity,
                "reservation_number": clash.reservation_number,
                "message": msg,
            })

    if driver_id:
        clashes = base.filter(Reservation.driver_id == driver_id).all()
        for clash in clashes:
            if new_start and new_end and clash.start_time and clash.end_time:
                if not _times_overlap(new_start, new_end, clash.start_time, clash.end_time):
                    continue
                severity = "blocking"
                msg = (
                    f"El conductor ya está asignado de {clash.start_time.strftime('%H:%M')} "
                    f"a {clash.end_time.strftime('%H:%M')} "
                    f"({clash.reservation_number} — {clash.display_customer})"
                )
            else:
                severity = "warning"
                msg = (
                    f"El conductor tiene otro evento ese día "
                    f"({clash.reservation_number} — {clash.display_customer}) — verifica los horarios"
                )
            conflicts.append({
                "type": "driver",
                "severity": severity,
                "reservation_number": clash.reservation_number,
                "message": msg,
            })

    return conflicts
