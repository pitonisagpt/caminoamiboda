from datetime import date, datetime
from typing import Optional

from sqlalchemy import Date, DateTime, String, Text, func
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
    referral_source: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
