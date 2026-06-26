import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Enum, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ContactType(str, enum.Enum):
    planner = "planner"
    venue = "venue"
    agency = "agency"
    other = "other"


class ContactStatus(str, enum.Enum):
    prospect = "prospect"
    active = "active"
    inactive = "inactive"


class Contact(Base):
    __tablename__ = "contacts"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    contact_type: Mapped[ContactType] = mapped_column(Enum(ContactType), default=ContactType.planner, nullable=False)
    location: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    instagram: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    status: Mapped[ContactStatus] = mapped_column(Enum(ContactStatus), default=ContactStatus.prospect, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    last_contacted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
