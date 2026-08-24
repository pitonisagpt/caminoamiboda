from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ServiceOrder(Base):
    """Per-event "orden de servicio" sent to a vehicle owner.

    Distinct from OwnerSettlement: this is a task-assignment document
    sent at/around confirmation time, referencing the owner's master
    contract (VehicleOwnerContract) for general terms. It doesn't
    reconcile actual payments — the settlement does that afterward.
    """

    __tablename__ = "service_orders"

    id: Mapped[int] = mapped_column(primary_key=True)
    order_number: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)

    reservation_id: Mapped[int] = mapped_column(ForeignKey("reservations.id", ondelete="CASCADE"), nullable=False)
    vehicle_id: Mapped[Optional[int]] = mapped_column(ForeignKey("vehicles.id", ondelete="SET NULL"), nullable=True)
    owner_id: Mapped[Optional[int]] = mapped_column(ForeignKey("vehicle_owners.id", ondelete="SET NULL"), nullable=True)

    owner_percentage: Mapped[int] = mapped_column(nullable=False, default=70)

    status: Mapped[str] = mapped_column(String(20), nullable=False, default="draft")
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    pdf_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    reservation = relationship("Reservation", foreign_keys=[reservation_id], lazy="select")
    vehicle = relationship("Vehicle", foreign_keys=[vehicle_id], lazy="select")
    owner = relationship("VehicleOwner", foreign_keys=[owner_id], lazy="select")
