from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.models.event_location import LocationType


class CatalogLocationCreate(BaseModel):
    name: str
    location_type: LocationType = LocationType.other
    address: Optional[str] = None
    google_maps_link: Optional[str] = None
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    notes: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None


class CatalogLocationUpdate(BaseModel):
    name: Optional[str] = None
    location_type: Optional[LocationType] = None
    address: Optional[str] = None
    google_maps_link: Optional[str] = None
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    notes: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None


class CatalogLocationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    location_type: LocationType
    address: Optional[str] = None
    google_maps_link: Optional[str] = None
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    notes: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    created_at: datetime
    updated_at: datetime
    usage_count: int = 0
