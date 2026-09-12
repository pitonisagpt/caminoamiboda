from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ReservationAddonPayment(Base):
    """Same idiom as OwnerSettlementPayment — a payment actually made
    toward an addon's provider_amount (the third-party's share of a
    ReservationAddon, e.g. what's owed to the florist), which
    ReservationAddon itself never tracked before (wishlist fila 35)."""

    __tablename__ = "reservation_addon_payments"

    id: Mapped[int] = mapped_column(primary_key=True)
    addon_id: Mapped[int] = mapped_column(
        ForeignKey("reservation_addons.id", ondelete="CASCADE"), nullable=False, index=True
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    paid_at: Mapped[date] = mapped_column(Date(), nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text(), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    addon = relationship("ReservationAddon", back_populates="payments")
