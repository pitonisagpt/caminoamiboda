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

WEEKDAY_ES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]

# Colombian public holidays (festivos), Ley Emiliani-adjusted where the law moves them
# to the following Monday. Source: official government calendar, cross-checked against
# Ley 2578 de 2026 (new Virgen de Chiquinquirá holiday, first observed July 13, 2026).
# Maintenance: update this set once a year with the following year's confirmed dates.
FESTIVOS_COLOMBIA: set[date] = {
    # 2026
    date(2026, 1, 1), date(2026, 1, 12), date(2026, 3, 23),
    date(2026, 4, 2), date(2026, 4, 3), date(2026, 5, 1),
    date(2026, 5, 18), date(2026, 6, 8), date(2026, 6, 15),
    date(2026, 6, 29), date(2026, 7, 13), date(2026, 7, 20),
    date(2026, 8, 7), date(2026, 8, 17), date(2026, 10, 12),
    date(2026, 11, 2), date(2026, 11, 16), date(2026, 12, 8),
    date(2026, 12, 25),
    # 2027
    date(2027, 1, 1), date(2027, 1, 11), date(2027, 3, 22),
    date(2027, 3, 25), date(2027, 3, 26), date(2027, 5, 1),
    date(2027, 5, 10), date(2027, 5, 31), date(2027, 6, 7),
    date(2027, 7, 5), date(2027, 7, 12), date(2027, 7, 20),
    date(2027, 8, 7), date(2027, 8, 16), date(2027, 10, 18),
    date(2027, 11, 1), date(2027, 11, 15), date(2027, 12, 8),
    date(2027, 12, 25),
}


def is_festivo(d: date) -> bool:
    """Return True if the given date is a Colombian public holiday."""
    return d in FESTIVOS_COLOMBIA


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
