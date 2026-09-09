from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class VehiclePhotoProvider(Base):
    """Many-to-many link between a VehiclePhoto and the Contact(s) credited
    on it — a photo can have 0, 1, or several. Same idiom as
    ReservationVehicle: a small join table, queried directly rather than
    via a relationship. CASCADE on both sides — if the photo or the
    contact is deleted, the credit no longer applies.

    Backed by Contact (not a dedicated "photo provider" table) — credited
    people are photographers, decorators, planners, etc., and the app
    already has one directory for exactly that (contacts.py)."""

    __tablename__ = "vehicle_photo_providers"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    photo_id: Mapped[int] = mapped_column(
        ForeignKey("vehicle_photos.id", ondelete="CASCADE"), nullable=False, index=True
    )
    contact_id: Mapped[int] = mapped_column(
        ForeignKey("contacts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
