from __future__ import annotations

from datetime import date, timedelta
from typing import Optional

from sqlalchemy.orm import Session, selectinload

from app.models.reservation import Reservation
from app.models.reservation_vehicle import ReservationVehicle
from app.models.timeline_activity import TimelineActivity
from app.models.vehicle import Vehicle
from app.services.event_span import MULTI_DAY_LOOKBACK_DAYS, effective_end_date
from app.services.pico_y_placa import PICO_HOURS, WEEKDAY_ES, get_effective_pyp, is_festivo

BLOCKING_STATUSES = {"pre_reserved", "deposit_received", "reserved", "confirmed"}


def find_conflicts(
    db: Session,
    event_date: date,
    vehicle_ids: list[int],
    driver_ids: list[int],
    owner_driver_ids: Optional[list[int]] = None,
    exclude_id: Optional[int] = None,
) -> list[dict]:
    """
    Return conflict dicts for any of the given vehicles/drivers on event_date.

    A reservation can now have several vehicles, each with its own optional
    driver — so both sides of the comparison (incoming and each candidate)
    are treated as SETS: a vehicle clash is "this vehicle is already used by
    ANY of the candidate's vehicles", independent of which driver is on it;
    a driver clash is the same idea across drivers, independent of vehicle.
    `driver_ids` are Driver.id values, `owner_driver_ids` are VehicleOwner.id
    values (an owner personally driving) — kept separate since they're
    different tables, potentially overlapping integer ranges.

    Reservations no longer carry a time window, so any same-vehicle or
    same-driver match on the same day is always a hard block — there's no
    signal left to distinguish a real overlap from a same-day-different-time
    booking.
    """
    owner_driver_ids = owner_driver_ids or []
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

    # Bulk-fetch every vehicle/driver/owner_driver assigned to each candidate
    # reservation — one extra query total, not one per candidate.
    candidate_ids = [r.id for r in candidates]
    vehicles_by_reservation: dict[int, set[int]] = {}
    drivers_by_reservation: dict[int, set[int]] = {}
    owner_drivers_by_reservation: dict[int, set[int]] = {}
    if candidate_ids:
        for rv in db.query(ReservationVehicle).filter(ReservationVehicle.reservation_id.in_(candidate_ids)).all():
            if rv.vehicle_id:
                vehicles_by_reservation.setdefault(rv.reservation_id, set()).add(rv.vehicle_id)
            if rv.driver_id:
                drivers_by_reservation.setdefault(rv.reservation_id, set()).add(rv.driver_id)
            if rv.owner_driver_id:
                owner_drivers_by_reservation.setdefault(rv.reservation_id, set()).add(rv.owner_driver_id)

    conflicts = []

    if vehicle_ids:
        for clash in candidates:
            if not (vehicles_by_reservation.get(clash.id, set()) & set(vehicle_ids)):
                continue
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

    if driver_ids or owner_driver_ids:
        for clash in candidates:
            has_driver_clash = bool(drivers_by_reservation.get(clash.id, set()) & set(driver_ids))
            has_owner_driver_clash = bool(owner_drivers_by_reservation.get(clash.id, set()) & set(owner_driver_ids))
            if not (has_driver_clash or has_owner_driver_clash):
                continue
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

    for vehicle_id in vehicle_ids:
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
