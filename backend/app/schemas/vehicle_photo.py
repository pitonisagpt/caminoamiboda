from datetime import datetime
from typing import List

from pydantic import BaseModel, model_validator


class VehiclePhotoRead(BaseModel):
    id: int
    vehicle_id: int
    file_name: str
    original_name: str
    display_order: int
    is_visible: bool
    url: str = ""
    created_at: datetime

    model_config = {"from_attributes": True}

    @model_validator(mode="after")
    def set_url(self) -> "VehiclePhotoRead":
        self.url = f"/api/uploads/vehicles/{self.file_name}"
        return self


class VehiclePhotoUpdate(BaseModel):
    id: int
    display_order: int
    is_visible: bool


class VehiclePhotoBatchUpdate(BaseModel):
    photos: List[VehiclePhotoUpdate]
