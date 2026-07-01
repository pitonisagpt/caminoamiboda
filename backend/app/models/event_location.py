import enum
from typing import Optional

from sqlalchemy import Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class LocationType(str, enum.Enum):
    pickup = "pickup"
    ceremony = "ceremony"
    reception = "reception"
    photoshoot = "photoshoot"
    other = "other"


class EventLocation(Base):
    __tablename__ = "event_locations"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    timeline_id: Mapped[int] = mapped_column(ForeignKey("event_timelines.id", ondelete="CASCADE"), index=True)
    location_name: Mapped[str] = mapped_column(String(255))
    location_type: Mapped[LocationType] = mapped_column(Enum(LocationType), default=LocationType.other)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    google_maps_link: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    contact_person: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    contact_phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    road_access_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    display_order: Mapped[int] = mapped_column(Integer, default=0)
