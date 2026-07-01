from datetime import date
from typing import Optional

DIGIT_TO_DAY = {
    "1": "Lunes", "2": "Lunes",
    "3": "Martes", "4": "Martes",
    "5": "Miércoles", "6": "Miércoles",
    "7": "Jueves", "8": "Jueves",
    "9": "Viernes", "0": "Viernes",
}

PICO_HOURS = "6:00–8:30 AM  |  5:00–7:30 PM"


def compute_pico_y_placa(
    license_plate: str,
    vehicle_type: str,
    location: str,
) -> Optional[str]:
    """Return the restricted weekday for pico y placa, or None if it doesn't apply."""
    if location != "medellin":
        return None
    plate = license_plate.upper().strip()
    if not plate:
        return None
    try:
        digit = plate[-1] if vehicle_type == "car" else plate[3]
    except IndexError:
        return None
    return DIGIT_TO_DAY.get(digit)


def get_effective_pyp(vehicle, event_date: Optional[date] = None) -> Optional[str]:
    """Return the effective pico y placa day for a vehicle on a given date.

    Uses the admin override if it is set and the event_date falls within the
    valid range. Falls back to the computed value from the plate digit.
    """
    override = getattr(vehicle, "pyp_day_override", None)
    if override:
        valid_from = getattr(vehicle, "pyp_valid_from", None)
        valid_to = getattr(vehicle, "pyp_valid_to", None)
        check_date = event_date or date.today()
        in_range = True
        if valid_from and isinstance(valid_from, date):
            in_range = in_range and check_date >= valid_from
        elif valid_from:
            in_range = in_range and check_date >= valid_from.date()
        if valid_to and isinstance(valid_to, date):
            in_range = in_range and check_date <= valid_to
        elif valid_to:
            in_range = in_range and check_date <= valid_to.date()
        if in_range:
            return override

    return compute_pico_y_placa(
        vehicle.license_plate,
        vehicle.vehicle_type.value,
        vehicle.location.value,
    )
