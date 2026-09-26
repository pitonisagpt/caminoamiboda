from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.models.reservation_contract import ClientType, IdType
from app.models.vehicle_owner_contract import ContractStatus


class ReservationContractRead(BaseModel):
    id: int
    reservation_id: int
    contract_number: str
    status: ContractStatus
    client_type: ClientType
    client_name: str
    client_legal_rep_name: Optional[str] = None
    client_legal_rep_id_number: Optional[str] = None
    client_id_type: IdType
    client_id_number: str
    authorized_use: Optional[str] = None
    special_conditions: Optional[str] = None
    schedule_availability: Optional[str] = None
    usage_location: Optional[str] = None
    authorized_routes: Optional[str] = None
    pdf_path: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    # Computed, not a DB column — what the PDF shows for "Uso autorizado"
    # when authorized_use is blank. Attached by the router per-response,
    # never settable via ReservationContractUpdate.
    default_authorized_use: str = ""

    model_config = {"from_attributes": True}


class ReservationContractUpdate(BaseModel):
    status: Optional[ContractStatus] = None
    client_type: Optional[ClientType] = None
    client_name: Optional[str] = None
    client_legal_rep_name: Optional[str] = None
    client_legal_rep_id_number: Optional[str] = None
    client_id_type: Optional[IdType] = None
    client_id_number: Optional[str] = None
    authorized_use: Optional[str] = None
    special_conditions: Optional[str] = None
    schedule_availability: Optional[str] = None
    usage_location: Optional[str] = None
    authorized_routes: Optional[str] = None
    notes: Optional[str] = None
