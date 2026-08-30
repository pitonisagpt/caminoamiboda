from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, field_validator

from app.schemas._validation import validate_phone_or_none


class CustomerFields(BaseModel):
    """Shared field declarations, with no validation — used as the base for
    CustomerRead so a malformed legacy value already sitting in the database
    (saved before this validator existed, or through a path that didn't
    apply it) never breaks reading the record back. A single bad row must
    never crash the whole list for every other customer. Validation only
    applies on writes, in CustomerBase/CustomerUpdate below."""
    bride_name: Optional[str] = None
    groom_name: Optional[str] = None
    main_contact_name: str
    identification_number: Optional[str] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    whatsapp_username: Optional[str] = None
    email: Optional[str] = None
    bride_email: Optional[str] = None
    groom_email: Optional[str] = None
    wedding_date: Optional[date] = None
    instagram: Optional[str] = None
    referral_source: Optional[str] = None
    notes: Optional[str] = None
    lead_status: str = 'activo'
    lead_temperature: Optional[str] = None
    aplica_hora_regalo: bool = False


class CustomerBase(CustomerFields):
    @field_validator("phone", "whatsapp", mode="before")
    @classmethod
    def validate_phone(cls, v):
        return validate_phone_or_none(v)


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    bride_name: Optional[str] = None
    groom_name: Optional[str] = None
    main_contact_name: Optional[str] = None
    identification_number: Optional[str] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    whatsapp_username: Optional[str] = None
    email: Optional[str] = None
    bride_email: Optional[str] = None
    groom_email: Optional[str] = None
    wedding_date: Optional[date] = None
    instagram: Optional[str] = None
    referral_source: Optional[str] = None
    notes: Optional[str] = None
    lead_status: Optional[str] = None
    lead_temperature: Optional[str] = None
    aplica_hora_regalo: Optional[bool] = None

    # Was previously missing entirely on this schema — meaning an update
    # could silently save something that isn't a phone number at all (this
    # is how a value like a WhatsApp username ended up saved in the `phone`
    # column of an existing customer, which in turn broke every read of the
    # customer list until CustomerRead stopped inheriting the validator).
    @field_validator("phone", "whatsapp", mode="before")
    @classmethod
    def validate_phone(cls, v):
        return validate_phone_or_none(v)


class CustomerRead(CustomerFields):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class WhatsappTextResponse(BaseModel):
    text: str
