import re
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, field_validator

from app.models.driver import DriverStatus

_PHONE_RE = re.compile(r"^\+?[\d\s\-().]{7,20}$")


def _validate_phone(v: Optional[str]) -> Optional[str]:
    if v is None or v.strip() == "":
        return v
    if not _PHONE_RE.match(v.strip()):
        raise ValueError("Número de teléfono inválido")
    return v.strip()


class DriverBase(BaseModel):
    full_name: str
    identification_number: Optional[str] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None

    @field_validator("phone", "whatsapp", mode="before")
    @classmethod
    def validate_phone(cls, v):
        return _validate_phone(v)
    email: Optional[str] = None
    driver_license_number: Optional[str] = None
    license_expiration_date: Optional[date] = None
    authorized_vehicles: Optional[str] = None
    notes: Optional[str] = None
    status: DriverStatus = DriverStatus.active


class DriverCreate(DriverBase):
    pass


class DriverUpdate(BaseModel):
    full_name: Optional[str] = None
    identification_number: Optional[str] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    email: Optional[str] = None
    driver_license_number: Optional[str] = None
    license_expiration_date: Optional[date] = None
    authorized_vehicles: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[DriverStatus] = None


class DriverRead(DriverBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
