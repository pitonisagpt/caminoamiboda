from datetime import date
from typing import Optional

from pydantic import BaseModel, EmailStr, field_validator

from app.schemas.customer import _validate_phone


class PublicLeadCreate(BaseModel):
    main_contact_name: str
    phone: str
    email: Optional[EmailStr] = None
    wedding_date: Optional[date] = None
    bride_name: Optional[str] = None
    groom_name: Optional[str] = None
    found_via: Optional[str] = None
    message: Optional[str] = None
    consent_accepted: bool
    elapsed_ms: int = 0
    hp_website: Optional[str] = None

    @field_validator("main_contact_name")
    @classmethod
    def name_required(cls, v: str) -> str:
        v = (v or "").strip()
        if len(v) < 2:
            raise ValueError("Nombre requerido")
        return v

    @field_validator("phone", mode="before")
    @classmethod
    def phone_required(cls, v):
        normalized = _validate_phone(v)
        if not normalized:
            raise ValueError("El teléfono es obligatorio")
        return normalized

    @field_validator("consent_accepted")
    @classmethod
    def consent_required(cls, v: bool) -> bool:
        if not v:
            raise ValueError("Debes aceptar la política de tratamiento de datos")
        return v


class PublicLeadResponse(BaseModel):
    ok: bool = True
