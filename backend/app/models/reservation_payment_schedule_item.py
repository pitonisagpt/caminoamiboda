from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ReservationPaymentScheduleItem(Base):
    """One line of a reservation's PAYMENT PLAN — e.g. "50% al confirmar la
    reserva", "saldo 8 días antes del evento" — used only to render clause
    QUINTA of ReservationContract. This is a plan of what SHOULD be paid and
    when, not a log of what WAS paid (that's ReservationPayment — do not
    conflate the two).

    Exactly one of percentage/fixed_amount is set per row, validated in the
    router's Pydantic create model. Query directly by reservation_id — same
    idiom as ReservationAddon/ReservationVehicle, no ORM collection
    relationship on Reservation.
    """

    __tablename__ = "reservation_payment_schedule_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    reservation_id: Mapped[int] = mapped_column(
        ForeignKey("reservations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    percentage: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    fixed_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
