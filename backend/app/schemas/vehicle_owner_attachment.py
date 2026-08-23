from datetime import datetime

from pydantic import BaseModel, model_validator

from app.core.urls import build_upload_url


class VehicleOwnerAttachmentUpdate(BaseModel):
    category: str


class VehicleOwnerAttachmentRead(BaseModel):
    id: int
    owner_id: int
    file_name: str
    original_name: str
    content_type: str
    size_bytes: int
    category: str
    url: str = ""
    uploaded_at: datetime

    model_config = {"from_attributes": True}

    @model_validator(mode="after")
    def set_url(self) -> "VehicleOwnerAttachmentRead":
        self.url = build_upload_url(f"/api/uploads/vehicle_owners/{self.file_name}")
        return self
