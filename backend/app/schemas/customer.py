import re
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, field_validator

_PHONE_RE = re.compile(r"^\+?[\d\s\-().]{7,20}$")


def _validate_phone(v: Optional[str]) -> Optional[str]:
    if v is None or v.strip() == "":
        return v
    if not _PHONE_RE.match(v.strip()):
        raise ValueError("Número de teléfono inválido")
    return v.strip()


class CustomerBase(BaseModel):
    bride_name: Optional[str] = None
    groom_name: Optional[str] = None
    main_contact_name: str
    identification_number: Optional[str] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None

    @field_validator("phone", "whatsapp", mode="before")
    @classmethod
    def validate_phone(cls, v):
        return _validate_phone(v)
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
    identification_number: Optional[str] = None
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
