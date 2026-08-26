from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ReservationVehicle(Base):
    """One row per vehicle linked to a reservation, each with its own
    optional driver. `Reservation.vehicle_id`/`driver_id`/`owner_driver_id`
    stay in sync as pointers to the FIRST vehicle here (by display_order) —
    the "primary" vehicle/driver — so the many places that still read a
    single vehicle/driver per reservation keep working unchanged.

    Same idiom as EventLocation/TimelineActivity: small child table with a
    FK + display_order. Query this directly (db.query(ReservationVehicle)...)
    rather than via `Reservation.vehicles` for anything that needs to be
    correct — this codebase has repeated warnings that cascade+order_by
    relationships of this shape don't reliably behave as a live list.
    """

    __tablename__ = "reservation_vehicles"

    id: Mapped[int] = mapped_column(primary_key=True)
    reservation_id: Mapped[int] = mapped_column(
        ForeignKey("reservations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    vehicle_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("vehicles.id", ondelete="SET NULL"), nullable=True, index=True
    )
    driver_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("drivers.id", ondelete="SET NULL"), nullable=True, index=True
    )
    owner_driver_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("vehicle_owners.id", ondelete="SET NULL"), nullable=True, index=True
    )
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (UniqueConstraint("reservation_id", "vehicle_id", name="uq_reservation_vehicle"),)

    # Scalar (many-to-one) relationships — safe to use directly, unlike the
    # cascade+order_by collection relationships this codebase warns about.
    vehicle = relationship("Vehicle", foreign_keys=[vehicle_id], lazy="select")
    driver = relationship("Driver", foreign_keys=[driver_id], lazy="select")
    owner_driver = relationship("VehicleOwner", foreign_keys=[owner_driver_id], lazy="select")
