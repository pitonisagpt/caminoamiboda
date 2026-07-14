import re
import unicodedata
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, field_validator

from app.models.driver import DriverStatus


def _validate_phone(v: Optional[str]) -> Optional[str]:
    if v is None:
        return v
    # Strip invisible Unicode format marks (e.g. the LRM/RLM direction marks
    # iOS/WhatsApp wrap around a phone number when you copy it as a detected
    # link) and fold odd whitespace variants (NBSP, etc.) into regular spaces,
    # so a pasted number isn't rejected just because of formatting noise.
    stripped = "".join(ch for ch in v if unicodedata.category(ch) != "Cf")
    normalized = re.sub(r"\s+", " ", unicodedata.normalize("NFKC", stripped)).strip()
    if normalized == "":
        return normalized
    digit_count = len(re.sub(r"\D", "", normalized))
    if digit_count < 7 or digit_count > 15:
        raise ValueError("Número de teléfono inválido")
    return normalized


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
