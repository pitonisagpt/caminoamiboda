import os
from typing import Optional

from sqlalchemy.orm import Session

from app.models.vehicle import Vehicle, VehicleLocation, VehicleStatus, VehicleType

XLSX_PATH = "/app/docs/base_de_datos_autos/2025_03_23_base_de_datos_autos.xlsx"

_LOCATION_MAP = {
    "medellín": VehicleLocation.medellin,
    "medellin": VehicleLocation.medellin,
    "rionegro": VehicleLocation.rionegro,
    "carmen de viboral": VehicleLocation.carmen_de_viboral,
}

_STATUS_MAP = {
    "activo": VehicleStatus.active,
    "inactivo": VehicleStatus.inactive,
    "pendiente": VehicleStatus.pending,
}

_TYPE_MAP = {
    "carro particular": VehicleType.car,
    "moto": VehicleType.motorcycle,
}


def _to_int(val) -> Optional[int]:
    try:
        return int(float(val)) if val is not None else None
    except (TypeError, ValueError):
        return None


def _to_phone(val) -> Optional[str]:
    """Convert Excel phone values (may be float like 3127986558.0) to clean string."""
    if val is None:
        return None
    if isinstance(val, float):
        return str(int(val))
    return str(val).strip() or None


def _to_float(val) -> Optional[float]:
    try:
        return float(val) if val is not None else None
    except (TypeError, ValueError):
        return None


def _to_score(val) -> Optional[int]:
    v = _to_int(val)
    return v if v is not None and 1 <= v <= 5 else None


def seed_vehicles(db: Session) -> int:
    if not os.path.exists(XLSX_PATH):
        print(f"⚠️  Seed skipped: {XLSX_PATH} not found")
        return 0

    try:
        import openpyxl
    except ImportError:
        print("⚠️  Seed skipped: openpyxl not installed")
        return 0

    wb = openpyxl.load_workbook(XLSX_PATH, data_only=True)
    ws = wb["Hoja 1"]

    seen_plates: set = set()
    count = 0

    for row in ws.iter_rows(min_row=2, values_only=True):
        plate = row[0]
        if not plate or not isinstance(plate, str) or plate.strip() == "":
            continue
        plate = plate.strip().upper()
        if plate in seen_plates:
            continue
        seen_plates.add(plate)

        brand = str(row[1]).strip() if row[1] else "Desconocido"
        model_line = str(row[2]).strip() if row[2] else None
        color = str(row[3]).strip() if row[3] else None
        year = _to_int(row[4])

        raw_type = str(row[6]).strip().lower() if row[6] else ""
        vehicle_type = _TYPE_MAP.get(raw_type, VehicleType.car)

        body_type = str(row[8]).strip() if row[8] else None
        capacity = _to_int(row[9])

        raw_loc = str(row[11]).strip().lower() if row[11] else ""
        location = _LOCATION_MAP.get(raw_loc, VehicleLocation.medellin)

        owner_name = str(row[12]).strip() if row[12] else None
        owner_contact = _to_phone(row[13])

        price_medellin = _to_float(row[17])
        price_rionegro = _to_float(row[18])

        raw_status = str(row[19]).strip().lower() if row[19] else "activo"
        status = _STATUS_MAP.get(raw_status, VehicleStatus.active)

        score_elegance = _to_score(row[20])
        score_exclusivity = _to_score(row[21])
        score_photogeny = _to_score(row[22])
        score_comfort = _to_score(row[23])
        score_romance = _to_score(row[24])

        vehicle = Vehicle(
            license_plate=plate,
            brand=brand,
            model_line=model_line,
            color=color,
            year=year,
            vehicle_type=vehicle_type,
            body_type=body_type,
            capacity=capacity,
            location=location,
            status=status,
            owner_name=owner_name,
            owner_contact=owner_contact,
            price_medellin=price_medellin,
            price_rionegro=price_rionegro,
            score_elegance=score_elegance,
            score_exclusivity=score_exclusivity,
            score_photogeny=score_photogeny,
            score_comfort=score_comfort,
            score_romance=score_romance,
        )
        db.add(vehicle)
        count += 1

    db.commit()
    print(f"✅ {count} vehículos importados desde Excel")
    return count
