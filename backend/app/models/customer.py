from datetime import date, datetime
from typing import Optional

from sqlalchemy import Boolean, Date, DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    bride_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    groom_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    main_contact_name: Mapped[str] = mapped_column(String(255))
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    whatsapp: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    wedding_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    instagram: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    identification_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    referral_source: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    lead_status: Mapped[str] = mapped_column(String(20), nullable=False, server_default='activo')
    lead_temperature: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    aplica_hora_regalo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default='false')
    consent_accepted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    consent_ip: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    consent_policy_version: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
