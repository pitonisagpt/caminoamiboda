from datetime import date, datetime
from typing import List, Literal, Optional

from pydantic import BaseModel

from app.models.vehicle import VehicleCategory, VehicleLocation, VehicleStatus, VehicleType
from app.schemas.vehicle_photo import VehiclePhotoRead
from app.services.pico_y_placa import PICO_HOURS, get_effective_pyp

# Unlike allowed_locations (a loose list of strings — a typo there just means
# "runs everywhere," a harmless fallback), a typo here silently drops a
# vehicle out of a use-case-filtered catalog, so it's worth validating on
# create/update. Still a plain JSON column, not a native Postgres enum —
# adding a 5th value later needs no migration, just extending this tuple.
VehicleUseCase = Literal["wedding", "audiovisual_production", "brand_activation", "tourism"]


class VehicleBase(BaseModel):
    license_plate: str
    brand: str
    model_line: Optional[str] = None
    color: Optional[str] = None
    year: Optional[int] = None
    vehicle_type: VehicleType = VehicleType.car
    body_type: Optional[str] = None
    category: Optional[VehicleCategory] = None
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
    bride_description: Optional[str] = None
    bride_description_en: Optional[str] = None


class VehicleCreate(VehicleBase):
    owner_id: Optional[int] = None
    is_company_owned: bool = False
    is_featured: bool = False
    allowed_locations: Optional[List[str]] = None
    available_for: Optional[List[VehicleUseCase]] = None
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
    category: Optional[VehicleCategory] = None
    capacity: Optional[int] = None
    location: Optional[VehicleLocation] = None
    status: Optional[VehicleStatus] = None
    owner_id: Optional[int] = None
    is_company_owned: Optional[bool] = None
    is_featured: Optional[bool] = None
    allowed_locations: Optional[List[str]] = None
    available_for: Optional[List[VehicleUseCase]] = None
    price_medellin: Optional[float] = None
    price_rionegro: Optional[float] = None
    score_elegance: Optional[int] = None
    score_exclusivity: Optional[int] = None
    score_photogeny: Optional[int] = None
    score_comfort: Optional[int] = None
    score_romance: Optional[int] = None
    description: Optional[str] = None
    bride_description: Optional[str] = None
    bride_description_en: Optional[str] = None
    pyp_day_override: Optional[str] = None
    pyp_valid_from: Optional[date] = None
    pyp_valid_to: Optional[date] = None


_BASE_SCALARS = [
    "id", "license_plate", "sku", "brand", "model_line", "color", "year",
    "vehicle_type", "body_type", "category", "capacity", "location", "status",
    "display_order",
    "price_medellin", "price_rionegro",
    "score_elegance", "score_exclusivity", "score_photogeny", "score_comfort", "score_romance",
    "description", "bride_description", "bride_description_en",
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
    sku: str
    owner_id: Optional[int] = None
    owner_name: Optional[str] = None
    owner_contact: Optional[str] = None
    owner_whatsapp_username: Optional[str] = None
    is_company_owned: bool = False
    is_featured: bool = False
    allowed_locations: Optional[List[str]] = None
    available_for: Optional[List[VehicleUseCase]] = None
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
        d = _build_dict(vehicle, ["owner_id", "owner_name", "owner_contact", "owner_whatsapp_username", "is_company_owned", "is_featured", "allowed_locations", "available_for", "created_at", "updated_at"])
        return cls.model_validate(d)


class VehicleList(BaseModel):
    """Lightweight list item for the admin — includes plate + owner contact info."""
    id: int
    license_plate: str
    sku: str
    brand: str
    model_line: Optional[str] = None
    color: Optional[str] = None
    year: Optional[int] = None
    vehicle_type: VehicleType
    body_type: Optional[str] = None
    category: Optional[VehicleCategory] = None
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
    owner_id: Optional[int] = None
    owner_name: Optional[str] = None
    owner_contact: Optional[str] = None
    owner_whatsapp_username: Optional[str] = None
    is_company_owned: bool = False
    is_featured: bool = False
    allowed_locations: Optional[List[str]] = None
    available_for: Optional[List[VehicleUseCase]] = None
    bride_description: Optional[str] = None
    bride_description_en: Optional[str] = None
    photos: List[VehiclePhotoRead] = []

    @classmethod
    def from_orm_with_pico(cls, vehicle) -> "VehicleList":
        d = _build_dict(vehicle, ["owner_id", "owner_name", "owner_contact", "owner_whatsapp_username", "is_company_owned", "is_featured", "allowed_locations", "available_for"])
        return cls.model_validate(d)


class VehiclePublicList(BaseModel):
    """Public catalog list item — never includes the license plate or the
    vehicle owner's name/contact info (a real person's phone number)."""
    id: int
    sku: str
    brand: str
    model_line: Optional[str] = None
    color: Optional[str] = None
    year: Optional[int] = None
    vehicle_type: VehicleType
    body_type: Optional[str] = None
    category: Optional[VehicleCategory] = None
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
    is_company_owned: bool = False
    is_featured: bool = False
    allowed_locations: Optional[List[str]] = None
    available_for: Optional[List[VehicleUseCase]] = None
    bride_description: Optional[str] = None
    bride_description_en: Optional[str] = None
    photos: List[VehiclePhotoRead] = []

    @classmethod
    def from_orm_with_pico(cls, vehicle) -> "VehiclePublicList":
        d = _build_dict(vehicle, ["is_company_owned", "is_featured", "allowed_locations", "available_for"])
        return cls.model_validate(d)
