from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, model_validator

from app.core.urls import build_upload_url


# Lightweight shape for a credited Contact (photographer, decorator, etc.)
# — just enough to render "Cortesía: Name" and link to Instagram. Not the
# full ContactRead: this is embedded in every photo, so keep it small.
class PhotoCreditContact(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    instagram: Optional[str] = None


class VehiclePhotoRead(BaseModel):
    id: int
    vehicle_id: int
    file_name: str
    original_name: str
    display_order: int
    is_visible: bool
    url: str = ""
    created_at: datetime
    # Optional credits (photographer, decorator, etc.) — empty for the vast
    # majority of photos. Comes from VehiclePhoto.providers, a viewonly
    # relationship, so from_attributes picks it up automatically.
    providers: List[PhotoCreditContact] = []

    model_config = {"from_attributes": True}

    @model_validator(mode="after")
    def set_url(self) -> "VehiclePhotoRead":
        self.url = build_upload_url(f"/api/uploads/vehicles/{self.file_name}")
        return self


class VehiclePhotoUpdate(BaseModel):
    id: int
    display_order: int
    is_visible: bool


class VehiclePhotoBatchUpdate(BaseModel):
    photos: List[VehiclePhotoUpdate]


class PhotoCreditIdsUpdate(BaseModel):
    """Body for PUT .../photos/{photo_id}/providers — replaces the full set
    of credited contacts."""
    contact_ids: list[int] = []
