from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, field_validator

from app.models.vehicle import VehicleLocation, VehicleStatus, VehicleType
from app.schemas.vehicle_photo import VehiclePhotoRead
from app.services.pico_y_placa import PICO_HOURS, compute_pico_y_placa


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
    price_medellin: Optional[float] = None
    price_rionegro: Optional[float] = None
    score_elegance: Optional[int] = None
    score_exclusivity: Optional[int] = None
    score_photogeny: Optional[int] = None
    score_comfort: Optional[int] = None
    score_romance: Optional[int] = None
    description: Optional[str] = None


def _load_photos(vehicle) -> List[VehiclePhotoRead]:
    raw = getattr(vehicle, "photos", None) or []
    photos = sorted(raw, key=lambda p: p.display_order)
    return [VehiclePhotoRead.model_validate(p) for p in photos]


class VehicleRead(VehicleBase):
    id: int
    owner_name: Optional[str] = None
    owner_contact: Optional[str] = None
    score_total: Optional[int] = None
    pico_y_placa_day: Optional[str] = None
    pico_y_placa_hours: Optional[str] = None
    photos: List[VehiclePhotoRead] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @field_validator("photos", mode="before")
    @classmethod
    def _coerce_photos(cls, v):
        return v or []

    @classmethod
    def from_orm_with_pico(cls, vehicle) -> "VehicleRead":
        data = cls.model_validate(vehicle)
        data.score_total = vehicle.score_total
        data.pico_y_placa_day = compute_pico_y_placa(
            vehicle.license_plate, vehicle.vehicle_type.value, vehicle.location.value
        )
        if data.pico_y_placa_day:
            data.pico_y_placa_hours = PICO_HOURS
        data.photos = _load_photos(vehicle)
        return data


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

    model_config = {"from_attributes": True}

    @field_validator("photos", mode="before")
    @classmethod
    def _coerce_photos(cls, v):
        return v or []

    @classmethod
    def from_orm_with_pico(cls, vehicle) -> "VehiclePublic":
        data = cls.model_validate(vehicle)
        data.score_total = vehicle.score_total
        data.pico_y_placa_day = compute_pico_y_placa(
            vehicle.license_plate, vehicle.vehicle_type.value, vehicle.location.value
        )
        if data.pico_y_placa_day:
            data.pico_y_placa_hours = PICO_HOURS
        data.photos = _load_photos(vehicle)
        return data


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
    owner_contact: Optional[str] = None
    photos: List[VehiclePhotoRead] = []

    model_config = {"from_attributes": True}

    @field_validator("photos", mode="before")
    @classmethod
    def _coerce_photos(cls, v):
        return v or []

    @classmethod
    def from_orm_with_pico(cls, vehicle) -> "VehicleList":
        data = cls.model_validate(vehicle)
        data.score_total = vehicle.score_total
        data.pico_y_placa_day = compute_pico_y_placa(
            vehicle.license_plate, vehicle.vehicle_type.value, vehicle.location.value
        )
        data.photos = _load_photos(vehicle)
        return data
