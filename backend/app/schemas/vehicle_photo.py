from datetime import datetime
from typing import List

from pydantic import BaseModel, model_validator

from app.core.urls import build_upload_url
from app.schemas.photo_provider import PhotoProviderBrief


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
    providers: List[PhotoProviderBrief] = []

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
