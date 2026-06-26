from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.models.contact import ContactStatus, ContactType


class ContactCreate(BaseModel):
    full_name: str
    contact_type: ContactType = ContactType.planner
    location: Optional[str] = None
    phone: Optional[str] = None
    instagram: Optional[str] = None
    email: Optional[str] = None
    status: ContactStatus = ContactStatus.prospect
    notes: Optional[str] = None


class ContactUpdate(BaseModel):
    full_name: Optional[str] = None
    contact_type: Optional[ContactType] = None
    location: Optional[str] = None
    phone: Optional[str] = None
    instagram: Optional[str] = None
    email: Optional[str] = None
    status: Optional[ContactStatus] = None
    notes: Optional[str] = None


class ContactRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    contact_type: ContactType
    location: Optional[str]
    phone: Optional[str]
    instagram: Optional[str]
    email: Optional[str]
    status: ContactStatus
    notes: Optional[str]
    last_contacted_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
