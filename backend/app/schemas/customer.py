from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class CustomerBase(BaseModel):
    bride_name: Optional[str] = None
    groom_name: Optional[str] = None
    main_contact_name: str
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    email: Optional[str] = None
    wedding_date: Optional[date] = None
    instagram: Optional[str] = None
    referral_source: Optional[str] = None
    notes: Optional[str] = None


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    bride_name: Optional[str] = None
    groom_name: Optional[str] = None
    main_contact_name: Optional[str] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    email: Optional[str] = None
    wedding_date: Optional[date] = None
    instagram: Optional[str] = None
    referral_source: Optional[str] = None
    notes: Optional[str] = None


class CustomerRead(CustomerBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
