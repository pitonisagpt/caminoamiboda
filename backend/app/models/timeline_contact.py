from typing import Optional

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class TimelineContact(Base):
    __tablename__ = "timeline_contacts"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    timeline_id: Mapped[int] = mapped_column(ForeignKey("event_timelines.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    role: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    display_order: Mapped[int] = mapped_column(Integer, default=0)
