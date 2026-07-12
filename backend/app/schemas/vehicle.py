from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel

from app.models.vehicle import VehicleLocation, VehicleStatus, VehicleType
from app.schemas.vehicle_photo import VehiclePhotoRead
from app.services.pico_y_placa import PICO_HOURS, compute_pico_y_placa, get_effective_pyp


class VehicleBase(BaseModel):
    license_plate: str
    brand: str
    model_line: Optional[str] = None
    color: Optional[str] = None
    year: Optional[int] = None
    vehicle_type: VehicleType = VehicleType.car
    body_type: Optional[str] = None
    capacity: Optional[int] = None
    location: VehicleLocation = VehicleLocation.medellin
    status: VehicleStatus = VehicleStatus.active
    price_medellin: Optional[float] = None
    price_rionegro: Optional[float] = None
    score_elegance: Optional[int] = None
    score_exclusivity: Optional[int] = None
    score_photogeny: Optional[int] = None
    score_comfort: Optional[int] = None
    score_romance: Optional[int] = None
    description: Optional[str] = None


class VehicleCreate(VehicleBase):
    owner_name: Optional[str] = None
    owner_contact: Optional[str] = None
    is_company_owned: bool = False
    allowed_locations: Optional[List[str]] = None
    pyp_day_override: Optional[str] = None
    pyp_valid_from: Optional[date] = None
    pyp_valid_to: Optional[date] = None


class VehicleUpdate(BaseModel):
    license_plate: Optional[str] = None
    brand: Optional[str] = None
    model_line: Optional[str] = None
    color: Optional[str] = None
    year: Optional[int] = None
    vehicle_type: Optional[VehicleType] = None
    body_type: Optional[str] = None
    capacity: Optional[int] = None
    location: Optional[VehicleLocation] = None
    status: Optional[VehicleStatus] = None
    owner_name: Optional[str] = None
    owner_contact: Optional[str] = None
    is_company_owned: Optional[bool] = None
    allowed_locations: Optional[List[str]] = None
    price_medellin: Optional[float] = None
    price_rionegro: Optional[float] = None
    score_elegance: Optional[int] = None
    score_exclusivity: Optional[int] = None
    score_photogeny: Optional[int] = None
    score_comfort: Optional[int] = None
    score_romance: Optional[int] = None
    description: Optional[str] = None
    pyp_day_override: Optional[str] = None
    pyp_valid_from: Optional[date] = None
    pyp_valid_to: Optional[date] = None


_BASE_SCALARS = [
    "id", "license_plate", "brand", "model_line", "color", "year",
    "vehicle_type", "body_type", "capacity", "location", "status",
    "display_order",
    "price_medellin", "price_rionegro",
    "score_elegance", "score_exclusivity", "score_photogeny", "score_comfort", "score_romance",
    "description",
    "pyp_day_override", "pyp_valid_from", "pyp_valid_to",
]


class ReorderItem(BaseModel):
    id: int
    display_order: int


def _load_photos(vehicle) -> List[VehiclePhotoRead]:
    from app.models.vehicle_photo import VehiclePhoto
    from sqlalchemy import inspect as sa_inspect
    session = sa_inspect(vehicle).session
    if session is not None:
        photos = session.query(VehiclePhoto).filter(
            VehiclePhoto.vehicle_id == vehicle.id
        ).order_by(VehiclePhoto.display_order).all()
    else:
        raw = getattr(vehicle, "photos", None) or []
        photos = sorted(raw, key=lambda p: p.display_order)
    return [VehiclePhotoRead.model_validate(p, from_attributes=True) for p in photos]


def _build_dict(vehicle, extra: list) -> dict:
    d = {f: getattr(vehicle, f, None) for f in _BASE_SCALARS + extra}
    d["photos"] = _load_photos(vehicle)
    pico = get_effective_pyp(vehicle)
    d["pico_y_placa_day"] = pico
    d["pico_y_placa_hours"] = PICO_HOURS if pico else None
    d["score_total"] = vehicle.score_total
    return d


class VehicleRead(VehicleBase):
    id: int
    owner_name: Optional[str] = None
    owner_contact: Optional[str] = None
    is_company_owned: bool = False
    allowed_locations: Optional[List[str]] = None
    score_total: Optional[int] = None
    pico_y_placa_day: Optional[str] = None
    pico_y_placa_hours: Optional[str] = None
    pyp_day_override: Optional[str] = None
    pyp_valid_from: Optional[date] = None
    pyp_valid_to: Optional[date] = None
    photos: List[VehiclePhotoRead] = []
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_orm_with_pico(cls, vehicle) -> "VehicleRead":
        d = _build_dict(vehicle, ["owner_name", "owner_contact", "is_company_owned", "allowed_locations", "created_at", "updated_at"])
        return cls.model_validate(d)


class VehiclePublic(BaseModel):
    """Public-facing schema — excludes owner info."""
    id: int
    license_plate: str
    brand: str
    model_line: Optional[str] = None
    color: Optional[str] = None
    year: Optional[int] = None
    vehicle_type: VehicleType
    body_type: Optional[str] = None
    capacity: Optional[int] = None
    location: VehicleLocation
    status: VehicleStatus
    price_medellin: Optional[float] = None
    price_rionegro: Optional[float] = None
    score_elegance: Optional[int] = None
    score_exclusivity: Optional[int] = None
    score_photogeny: Optional[int] = None
    score_comfort: Optional[int] = None
    score_romance: Optional[int] = None
    score_total: Optional[int] = None
    pico_y_placa_day: Optional[str] = None
    pico_y_placa_hours: Optional[str] = None
    description: Optional[str] = None
    photos: List[VehiclePhotoRead] = []
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_orm_with_pico(cls, vehicle) -> "VehiclePublic":
        d = _build_dict(vehicle, ["created_at", "updated_at"])
        return cls.model_validate(d)


class VehicleList(BaseModel):
    """Lightweight list item for both admin and public."""
    id: int
    license_plate: str
    brand: str
    model_line: Optional[str] = None
    color: Optional[str] = None
    year: Optional[int] = None
    vehicle_type: VehicleType
    body_type: Optional[str] = None
    capacity: Optional[int] = None
    location: VehicleLocation
    status: VehicleStatus
    display_order: int = 0
    price_medellin: Optional[float] = None
    price_rionegro: Optional[float] = None
    score_elegance: Optional[int] = None
    score_exclusivity: Optional[int] = None
    score_photogeny: Optional[int] = None
    score_comfort: Optional[int] = None
    score_romance: Optional[int] = None
    score_total: Optional[int] = None
    pico_y_placa_day: Optional[str] = None
    owner_name: Optional[str] = None
    owner_contact: Optional[str] = None
    allowed_locations: Optional[List[str]] = None
    photos: List[VehiclePhotoRead] = []

    @classmethod
    def from_orm_with_pico(cls, vehicle) -> "VehicleList":
        d = _build_dict(vehicle, ["owner_name", "owner_contact", "allowed_locations"])
        return cls.model_validate(d)
