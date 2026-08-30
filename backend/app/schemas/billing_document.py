from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, field_validator

from app.models.billing_document import ClientType, DocumentStatus, DocumentType, IdType


def _empty_str_to_none(v):
    return v or None


class BillingDocumentFields(BaseModel):
    """Shared field declarations, with no validation — used as the base for
    BillingDocumentRead so an already-saved value that wouldn't pass the
    write-time checks below (e.g. a total_amount of 0, saved through a path
    that didn't validate) never breaks reading the document back. Same
    pattern as customer.py/driver.py."""
    document_type: DocumentType = DocumentType.formal
    reservation_id: Optional[int] = None
    service_date: date
    service_date_end: Optional[date] = None
    client_type: ClientType = ClientType.individual
    client_name: str
    client_legal_rep_name: Optional[str] = None
    client_id_type: IdType = IdType.CC
    client_id_number: str
    client_address: Optional[str] = None
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
    concept: str
    vehicle_description: Optional[str] = None
    time_start: Optional[str] = None
    time_end: Optional[str] = None
    route: Optional[str] = None
    special_conditions: Optional[str] = None
    total_amount: Decimal
    payment_instructions: str
    include_cancellation_policy: bool = True
    include_breakdown_policy: bool = True
    include_no_retencion_declaration: bool = False
    notes: Optional[str] = None


class BillingDocumentBase(BillingDocumentFields):
    @field_validator("total_amount")
    @classmethod
    def total_amount_must_be_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("total_amount must be positive")
        return v

    @field_validator("service_date_end", mode="before")
    @classmethod
    def blank_service_date_end(cls, v):
        return _empty_str_to_none(v)


class BillingDocumentCreate(BillingDocumentBase):
    pass


class BillingDocumentUpdate(BaseModel):
    document_type: Optional[DocumentType] = None
    status: Optional[DocumentStatus] = None
    reservation_id: Optional[int] = None
    service_date: Optional[date] = None
    service_date_end: Optional[date] = None

    @field_validator("service_date_end", mode="before")
    @classmethod
    def blank_service_date_end(cls, v):
        return _empty_str_to_none(v)

    # Was previously missing entirely on this schema — a PUT could save
    # total_amount=0, after which every GET of that document 500'd (same
    # gap that let a bad customer phone in — see customer.py). Guarded for
    # None since this field is optional here, unlike on Create.
    @field_validator("total_amount")
    @classmethod
    def total_amount_must_be_positive(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None and v <= 0:
            raise ValueError("total_amount must be positive")
        return v
    client_type: Optional[ClientType] = None
    client_name: Optional[str] = None
    client_legal_rep_name: Optional[str] = None
    client_id_type: Optional[IdType] = None
    client_id_number: Optional[str] = None
    client_address: Optional[str] = None
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
    concept: Optional[str] = None
    vehicle_description: Optional[str] = None
    time_start: Optional[str] = None
    time_end: Optional[str] = None
    route: Optional[str] = None
    special_conditions: Optional[str] = None
    total_amount: Optional[Decimal] = None
    payment_instructions: Optional[str] = None
    include_cancellation_policy: Optional[bool] = None
    include_breakdown_policy: Optional[bool] = None
    include_no_retencion_declaration: Optional[bool] = None
    notes: Optional[str] = None


class BillingDocumentRead(BillingDocumentFields):
    id: int
    document_number: str
    status: DocumentStatus
    created_at: datetime
    updated_at: datetime
    pdf_path: Optional[str] = None

    model_config = {"from_attributes": True}


class BillingDocumentList(BaseModel):
    id: int
    document_number: str
    document_type: DocumentType
    status: DocumentStatus
    reservation_id: Optional[int] = None
    client_name: str
    service_date: date
    total_amount: Decimal
    created_at: datetime
    pdf_path: Optional[str] = None

    model_config = {"from_attributes": True}


class PdfResponse(BaseModel):
    document_number: str
    pdf_url: str
