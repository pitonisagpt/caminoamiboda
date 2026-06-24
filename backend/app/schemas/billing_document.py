from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, field_validator

from app.models.billing_document import DocumentStatus, DocumentType, IdType


class BillingDocumentBase(BaseModel):
    document_type: DocumentType = DocumentType.formal
    service_date: date
    client_name: str
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
    notes: Optional[str] = None

    @field_validator("total_amount")
    @classmethod
    def total_amount_must_be_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("total_amount must be positive")
        return v


class BillingDocumentCreate(BillingDocumentBase):
    pass


class BillingDocumentUpdate(BaseModel):
    document_type: Optional[DocumentType] = None
    status: Optional[DocumentStatus] = None
    service_date: Optional[date] = None
    client_name: Optional[str] = None
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
    notes: Optional[str] = None


class BillingDocumentRead(BillingDocumentBase):
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
    client_name: str
    service_date: date
    total_amount: Decimal
    created_at: datetime
    pdf_path: Optional[str] = None

    model_config = {"from_attributes": True}


class PdfResponse(BaseModel):
    document_number: str
    pdf_url: str
