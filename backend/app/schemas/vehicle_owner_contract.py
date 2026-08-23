from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.models.vehicle_owner_contract import ContractStatus


class VehicleOwnerContractRead(BaseModel):
    id: int
    owner_id: int
    contract_number: str
    status: ContractStatus
    pdf_path: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
