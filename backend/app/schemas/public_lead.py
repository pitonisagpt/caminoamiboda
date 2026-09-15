from datetime import date
from typing import Optional

from pydantic import BaseModel, EmailStr, field_validator

from app.schemas._validation import is_whatsapp_username, validate_phone_or_none


class PublicLeadCreate(BaseModel):
    main_contact_name: str
    # Either a phone number or a WhatsApp username — some prospects (or
    # people abroad) may not want to give a raw phone number, and
    # Customer.whatsapp_username already exists for exactly this elsewhere
    # in the app. Classified in create_public_lead() via
    # is_whatsapp_username(), same rule as the format check below.
    contact: str
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

    @field_validator("contact", mode="before")
    @classmethod
    def contact_required(cls, v):
        v = (v or "").strip()
        if not v:
            raise ValueError("El teléfono o usuario de WhatsApp es obligatorio")
        if is_whatsapp_username(v):
            return v
        normalized = validate_phone_or_none(v)
        if not normalized:
            raise ValueError("Número de teléfono inválido")
        return normalized

    @field_validator("consent_accepted")
    @classmethod
    def consent_required(cls, v: bool) -> bool:
        if not v:
            raise ValueError("Debes aceptar la política de tratamiento de datos")
        return v


class PublicLeadResponse(BaseModel):
    ok: bool = True
