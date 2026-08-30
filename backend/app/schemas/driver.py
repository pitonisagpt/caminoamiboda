from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, field_validator

from app.models.driver import DriverStatus
from app.schemas._validation import validate_phone_or_none


class DriverFields(BaseModel):
    """Shared field declarations, with no validation — used as the base for
    DriverRead so a malformed legacy value already sitting in the database
    never breaks reading the record back. Validation only applies on
    writes, in DriverBase/DriverUpdate below. Same pattern as customer.py."""
    full_name: str
    identification_number: Optional[str] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    whatsapp_username: Optional[str] = None
    email: Optional[str] = None
    driver_license_number: Optional[str] = None
    license_expiration_date: Optional[date] = None
    authorized_vehicles: Optional[str] = None
    notes: Optional[str] = None
    status: DriverStatus = DriverStatus.active


class DriverBase(DriverFields):
    @field_validator("phone", "whatsapp", mode="before")
    @classmethod
    def validate_phone(cls, v):
        return validate_phone_or_none(v)


class DriverCreate(DriverBase):
    pass


class DriverUpdate(BaseModel):
    full_name: Optional[str] = None
    identification_number: Optional[str] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    whatsapp_username: Optional[str] = None
    email: Optional[str] = None
    driver_license_number: Optional[str] = None
    license_expiration_date: Optional[date] = None
    authorized_vehicles: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[DriverStatus] = None

    # Was previously missing entirely on this schema — same gap that let a
    # non-phone value get saved on a customer (see customer.py).
    @field_validator("phone", "whatsapp", mode="before")
    @classmethod
    def validate_phone(cls, v):
        return validate_phone_or_none(v)


class DriverRead(DriverFields):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
