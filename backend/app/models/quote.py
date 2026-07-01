from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import Optional

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class QuoteStatus(str, Enum):
    draft = "draft"
    sent = "sent"
    accepted = "accepted"
    rejected = "rejected"
    expired = "expired"


class LocationZone(str, Enum):
    medellin = "medellin"
    rionegro = "rionegro"
    other = "other"


class Quote(Base):
    __tablename__ = "quotes"

    id: Mapped[int] = mapped_column(primary_key=True)
    quote_number: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)

    customer_id: Mapped[Optional[int]] = mapped_column(ForeignKey("customers.id", ondelete="SET NULL"), nullable=True)
    customer_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    customer_phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    vehicle_id: Mapped[Optional[int]] = mapped_column(ForeignKey("vehicles.id", ondelete="SET NULL"), nullable=True)
    vehicle_description: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)

    event_date: Mapped[date] = mapped_column(Date(), nullable=False)
    service_duration: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    location_zone: Mapped[str] = mapped_column(String(30), nullable=False, default="medellin")

    pickup_location: Mapped[Optional[str]] = mapped_column(Text(), nullable=True)
    ceremony_location: Mapped[Optional[str]] = mapped_column(Text(), nullable=True)
    reception_location: Mapped[Optional[str]] = mapped_column(Text(), nullable=True)

    total_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    deposit_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)
    payment_instructions: Mapped[Optional[str]] = mapped_column(Text(), nullable=True)

    notes: Mapped[Optional[str]] = mapped_column(Text(), nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="draft")

    extra_hours: Mapped[int] = mapped_column(Integer(), nullable=False, default=0, server_default='0')
    addon_package_ids: Mapped[Optional[list]] = mapped_column(JSONB(), nullable=True, default=list)
    addons_total: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0"), server_default='0')
    pdf_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    share_token: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    customer: Mapped[Optional[object]] = relationship("Customer", foreign_keys=[customer_id], lazy="select")
    vehicle: Mapped[Optional[object]] = relationship("Vehicle", foreign_keys=[vehicle_id], lazy="select")

    @property
    def resolved_customer_phone(self) -> Optional[str]:
        if self.customer_phone:
            return self.customer_phone
        if self.customer:
            return getattr(self.customer, "whatsapp", None) or getattr(self.customer, "phone", None)
        return None

    @property
    def display_customer(self) -> str:
        if self.customer_name:
            return self.customer_name
        if self.customer and hasattr(self.customer, "main_contact_name"):
            return self.customer.main_contact_name
        return "—"

    @property
    def display_vehicle(self) -> str:
        if self.vehicle_description:
            return self.vehicle_description
        if self.vehicle:
            v = self.vehicle
            parts = [v.brand]
            if v.model_line:
                parts.append(v.model_line)
            if v.color:
                parts.append(v.color)
            return " ".join(parts)
        return "—"
