import enum
from typing import Optional

from sqlalchemy import Double, Enum, ForeignKey, Integer, String, Text
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
    lat: Mapped[Optional[float]] = mapped_column(Double, nullable=True)
    lng: Mapped[Optional[float]] = mapped_column(Double, nullable=True)
    # Manually pasted Waze link — only set when the auto-generated one (from
    # lat/lng, see effective_waze_link) is wrong for this specific spot.
    waze_link: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    @property
    def effective_waze_link(self) -> Optional[str]:
        if self.waze_link:
            return self.waze_link
        if self.lat is not None and self.lng is not None:
            # %2C, not a raw comma: WhatsApp's link auto-detection treats an
            # unescaped comma inside ll=lat,lng as sentence punctuation and
            # truncates the clickable link right before the longitude —
            # confirmed by reproducing it (the truncated link falls back to
            # Waze's default view, landing in a different part of the same
            # city). The comma still round-trips fine when clicked directly.
            return f"https://waze.com/ul?ll={self.lat}%2C{self.lng}&navigate=yes"
        return None
