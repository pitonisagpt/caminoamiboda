from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import Optional

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ReservationStatus(str, Enum):
    lead = "lead"
    quoted = "quoted"
    deposit_received = "deposit_received"
    reserved = "reserved"
    confirmed = "confirmed"
    completed = "completed"
    cancelled = "cancelled"


class Reservation(Base):
    __tablename__ = "reservations"

    id: Mapped[int] = mapped_column(primary_key=True)
    reservation_number: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)

    customer_id: Mapped[Optional[int]] = mapped_column(ForeignKey("customers.id", ondelete="SET NULL"), nullable=True)
    quote_id: Mapped[Optional[int]] = mapped_column(ForeignKey("quotes.id", ondelete="SET NULL"), nullable=True)
    vehicle_id: Mapped[Optional[int]] = mapped_column(ForeignKey("vehicles.id", ondelete="SET NULL"), nullable=True)
    driver_id: Mapped[Optional[int]] = mapped_column(ForeignKey("drivers.id", ondelete="SET NULL"), nullable=True)

    event_date: Mapped[date] = mapped_column(Date(), nullable=False)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0"))
    deposit_paid: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0"))
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="lead")

    event_category: Mapped[str] = mapped_column(String(20), nullable=False, default="standard")
    gcal_imported: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    special_instructions: Mapped[Optional[str]] = mapped_column(Text(), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text(), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    customer = relationship("Customer", foreign_keys=[customer_id], lazy="select")
    quote = relationship("Quote", foreign_keys=[quote_id], lazy="select")
    vehicle = relationship("Vehicle", foreign_keys=[vehicle_id], lazy="select")
    driver = relationship("Driver", foreign_keys=[driver_id], lazy="select")

    @property
    def remaining_balance(self) -> Decimal:
        return max(Decimal("0"), self.total_amount - self.deposit_paid)

    @property
    def display_customer(self) -> str:
        if self.customer:
            c = self.customer
            if getattr(c, "bride_name", None) and getattr(c, "groom_name", None):
                return f"{c.bride_name} & {c.groom_name}"
            return c.main_contact_name
        return "—"

    @property
    def display_vehicle(self) -> str:
        if self.vehicle:
            v = self.vehicle
            parts = [v.brand]
            if getattr(v, "model_line", None):
                parts.append(v.model_line)
            if v.color:
                parts.append(v.color)
            return " ".join(parts)
        return "—"

    @property
    def display_driver(self) -> str:
        if self.driver:
            return self.driver.full_name
        return "—"
