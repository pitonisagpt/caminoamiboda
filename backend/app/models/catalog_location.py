from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Double, Enum, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.event_location import LocationType


class CatalogLocation(Base):
    __tablename__ = "catalog_locations"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    location_type: Mapped[LocationType] = mapped_column(
        Enum(LocationType, create_type=False), default=LocationType.other
    )
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    google_maps_link: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    contact_person: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    contact_phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    lat: Mapped[Optional[float]] = mapped_column(Double, nullable=True)
    lng: Mapped[Optional[float]] = mapped_column(Double, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
