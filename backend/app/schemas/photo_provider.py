from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class PhotoProviderFields(BaseModel):
    name: str
    category: Optional[str] = None
    instagram_url: Optional[str] = None
    website_url: Optional[str] = None
    notes: Optional[str] = None


class PhotoProviderCreate(PhotoProviderFields):
    pass


class PhotoProviderUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    instagram_url: Optional[str] = None
    website_url: Optional[str] = None
    notes: Optional[str] = None


class PhotoProviderRead(PhotoProviderFields):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


# Lightweight shape embedded in VehiclePhotoRead.providers — just enough to
# render a credit line ("Cortesía: Name") that links out to Instagram.
class PhotoProviderBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    instagram_url: Optional[str] = None


class PhotoProviderIdsUpdate(BaseModel):
    """Body for PUT .../photos/{photo_id}/providers — replaces the full set."""
    provider_ids: list[int] = []
