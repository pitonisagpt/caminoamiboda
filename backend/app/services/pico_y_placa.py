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
