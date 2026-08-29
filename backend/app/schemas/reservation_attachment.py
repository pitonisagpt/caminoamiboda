from datetime import datetime

from pydantic import BaseModel, model_validator

from app.core.urls import build_upload_url


class ReservationAttachmentUpdate(BaseModel):
    category: str


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
        # Served through an authenticated route, not the /api/uploads/...
        # static mount — reservation attachments (contracts, payment
        # receipts) must not be reachable by anyone who merely has the URL.
        self.url = build_upload_url(f"/api/reservations/{self.reservation_id}/attachments/{self.id}/file")
        return self
