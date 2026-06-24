import enum
from datetime import date, datetime
from typing import Optional

from sqlalchemy import Boolean, Date, DateTime, Enum, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class DocumentType(str, enum.Enum):
    formal = "formal"
    letter = "letter"


class DocumentStatus(str, enum.Enum):
    draft = "draft"
    sent = "sent"
    paid = "paid"


class IdType(str, enum.Enum):
    CC = "CC"
    NIT = "NIT"


class BillingDocument(Base):
    __tablename__ = "billing_documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    document_number: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    document_type: Mapped[DocumentType] = mapped_column(Enum(DocumentType), default=DocumentType.formal)
    status: Mapped[DocumentStatus] = mapped_column(Enum(DocumentStatus), default=DocumentStatus.draft)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Client
    client_name: Mapped[str] = mapped_column(String(255))
    client_id_type: Mapped[IdType] = mapped_column(Enum(IdType), default=IdType.CC)
    client_id_number: Mapped[str] = mapped_column(String(50))
    client_address: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    client_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    client_phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Service
    service_date: Mapped[date] = mapped_column(Date)
    concept: Mapped[str] = mapped_column(Text)

    # Letter-style extras
    vehicle_description: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    time_start: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    time_end: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    route: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    special_conditions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Financial
    total_amount: Mapped[float] = mapped_column(Numeric(12, 2))
    payment_instructions: Mapped[str] = mapped_column(Text)

    # Policy flags (letter style)
    include_cancellation_policy: Mapped[bool] = mapped_column(Boolean, default=True)
    include_breakdown_policy: Mapped[bool] = mapped_column(Boolean, default=True)

    # Storage
    pdf_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
