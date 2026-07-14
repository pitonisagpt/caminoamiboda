from typing import Optional

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class TimelineActivity(Base):
    __tablename__ = "timeline_activities"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    timeline_id: Mapped[int] = mapped_column(ForeignKey("event_timelines.id", ondelete="CASCADE"), index=True)
    location_id: Mapped[Optional[int]] = mapped_column(ForeignKey("event_locations.id", ondelete="SET NULL"), nullable=True)
    time: Mapped[str] = mapped_column(String(10))          # "09:30"
    day_number: Mapped[int] = mapped_column(Integer, default=1, server_default='1')  # 1 = event_date, 2 = event_date+1, ...
    description: Mapped[str] = mapped_column(Text)
    estimated_duration: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # "30 min"
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    display_order: Mapped[int] = mapped_column(Integer, default=0)
