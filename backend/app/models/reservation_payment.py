from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ReservationPayment(Base):
    __tablename__ = "reservation_payments"

    id: Mapped[int] = mapped_column(primary_key=True)
    reservation_id: Mapped[int] = mapped_column(
        ForeignKey("reservations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    paid_at: Mapped[date] = mapped_column(Date(), nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text(), nullable=True)
    # "cash" = real money received; "withholding" = retención en la fuente —
    # the client's payment obligation for this amount is discharged, but no
    # cash actually reaches the company (it's a tax credit, not revenue).
    payment_type: Mapped[str] = mapped_column(String(20), nullable=False, default="cash")
    # Informational only — the % the client applied, so it can be reconciled
    # later against their certificado de retención. `amount` is always the
    # source of truth for the actual math.
    withholding_percentage: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    reservation = relationship("Reservation", back_populates="payments")
