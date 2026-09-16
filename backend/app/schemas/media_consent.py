from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.models.vehicle_owner_contract import ContractStatus


class MediaConsentRead(BaseModel):
    id: int
    reservation_id: int
    consent_number: str
    status: ContractStatus
    bride_name: str
    bride_id_number: Optional[str] = None
    groom_name: str
    groom_id_number: Optional[str] = None
    pdf_path: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MediaConsentUpdate(BaseModel):
    status: Optional[ContractStatus] = None
    bride_name: Optional[str] = None
    bride_id_number: Optional[str] = None
    groom_name: Optional[str] = None
    groom_id_number: Optional[str] = None
    notes: Optional[str] = None
