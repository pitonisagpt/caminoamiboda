from datetime import datetime

from pydantic import BaseModel, model_validator


class ReservationAttachmentRead(BaseModel):
    id: int
    reservation_id: int
    file_name: str
    original_name: str
    content_type: str
    size_bytes: int
    category: str
    url: str = ""
    uploaded_at: datetime

    model_config = {"from_attributes": True}

    @model_validator(mode="after")
    def set_url(self) -> "ReservationAttachmentRead":
        self.url = f"/api/uploads/reservations/{self.file_name}"
        return self
