from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class VehicleOwnerBase(BaseModel):
    full_name: str
    identification_number: Optional[str] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    email: Optional[str] = None
    bank_name: Optional[str] = None
    account_type: Optional[str] = None
    account_number: Optional[str] = None


class VehicleOwnerCreate(VehicleOwnerBase):
    pass


class VehicleOwnerUpdate(BaseModel):
    full_name: Optional[str] = None
    identification_number: Optional[str] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    email: Optional[str] = None
    bank_name: Optional[str] = None
    account_type: Optional[str] = None
    account_number: Optional[str] = None


class VehicleOwnerRead(VehicleOwnerBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
