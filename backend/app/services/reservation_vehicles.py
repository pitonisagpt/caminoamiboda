from typing import Optional

from sqlalchemy.orm import Session

from app.models.reservation_vehicle import ReservationVehicle


def get_reservation_vehicles(reservation_id: int, db: Session) -> list[ReservationVehicle]:
    """The reservation's vehicle+driver rows, in display order. Always query
    this directly rather than via `Reservation.vehicles` — see the model's
    docstring for why."""
    return (
        db.query(ReservationVehicle)
        .filter(ReservationVehicle.reservation_id == reservation_id)
        .order_by(ReservationVehicle.display_order)
        .all()
    )


def get_reservation_vehicles_by_ids(reservation_ids: list[int], db: Session) -> dict[int, list[ReservationVehicle]]:
    """Same rows as get_reservation_vehicles, batched across many reservations
    in one query instead of one query each — for list endpoints that would
    otherwise call get_reservation_vehicles per row (N+1, flagged by Sentry
    on GET /api/reservations)."""
    if not reservation_ids:
        return {}
    rows = (
        db.query(ReservationVehicle)
        .filter(ReservationVehicle.reservation_id.in_(reservation_ids))
        .order_by(ReservationVehicle.display_order)
        .all()
    )
    grouped: dict[int, list[ReservationVehicle]] = {}
    for rv in rows:
        grouped.setdefault(rv.reservation_id, []).append(rv)
    return grouped


def rv_display_driver(rv: ReservationVehicle) -> Optional[str]:
    """Same owner_driver-priority rule as Reservation.display_driver, for a
    single vehicle assignment."""
    if rv.owner_driver_id and rv.owner_driver:
        return rv.owner_driver.full_name
    if rv.driver:
        return rv.driver.full_name
    return None


def rv_display_driver_phone(rv: ReservationVehicle) -> Optional[str]:
    if rv.owner_driver_id and rv.owner_driver:
        return rv.owner_driver.phone or getattr(rv.owner_driver, "whatsapp", None)
    if rv.driver:
        return rv.driver.phone or getattr(rv.driver, "whatsapp", None)
    return None


def vehicle_display_name(v) -> str:
    parts = [v.brand]
    if getattr(v, "model_line", None):
        parts.append(v.model_line)
    if v.color:
        parts.append(v.color)
    return " ".join(parts)


def display_vehicle_str(vehicles: list[ReservationVehicle]) -> str:
    """Plain-text summary for WhatsApp/Google Calendar — pairs each vehicle
    with its driver, but only when that's actually needed to disambiguate
    (drivers differ across vehicles). When every vehicle shares the same
    driver (the common case — one person driving both cars), naming that
    driver after each vehicle is just noise, so it's mentioned once at the
    end instead:

    - all same driver:  "Combi T1 + VW Escarabajo (conductor: Juan Pérez)"
    - different drivers: "Combi T1 (conductor: Juan Pérez) + VW Escarabajo (conductor: Pedro Gómez)"
    - no driver at all: "Combi T1 + VW Escarabajo"
    """
    named = [(vehicle_display_name(rv.vehicle), rv_display_driver(rv)) for rv in vehicles if rv.vehicle]
    if not named:
        return "—"
    names = [n for n, _ in named]
    drivers = {d for _, d in named if d}
    if len(drivers) == 1 and all(d is not None for _, d in named):
        return f"{' + '.join(names)} (conductor: {drivers.pop()})"
    parts = [f"{n} (conductor: {d})" if d else n for n, d in named]
    return " + ".join(parts)
