from datetime import datetime
from typing import TYPE_CHECKING, List

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

if TYPE_CHECKING:
    from app.models.contact import Contact

from app.database import Base


class VehiclePhoto(Base):
    __tablename__ = "vehicle_photos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    vehicle_id: Mapped[int] = mapped_column(Integer, ForeignKey("vehicles.id", ondelete="CASCADE"), index=True)
    file_name: Mapped[str] = mapped_column(String(255), unique=True)
    original_name: Mapped[str] = mapped_column(String(255))
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    is_visible: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # viewonly=True on purpose — writes to the credit set go through
    # VehiclePhotoProvider directly (PUT .../photos/{id}/providers), never
    # through this relationship. Same reasoning ReservationVehicle's
    # docstring gives for not trusting a live ORM list on a join table for
    # writes; read-only here sidesteps that footgun entirely.
    #
    # Mapped[List["Contact"]] must stay parameterized like this — an
    # unparameterized Mapped[list] made SQLAlchemy infer uselist=False
    # (ignoring an explicit uselist=True kwarg), so this returned None
    # instead of [] and crashed GET /api/vehicles/{id}.
    providers: Mapped[List["Contact"]] = relationship(
        "Contact", secondary="vehicle_photo_providers", viewonly=True,
        order_by="Contact.full_name",
    )
