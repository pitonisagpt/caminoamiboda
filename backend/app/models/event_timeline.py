import enum
import uuid
from datetime import date, datetime
from typing import Optional

from sqlalchemy import Date, DateTime, Enum, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class EventType(str, enum.Enum):
    wedding = "wedding"
    brand_activation = "brand_activation"
    audiovisual_production = "audiovisual_production"
    quinceanera = "quinceanera"
    other = "other"


def _new_token() -> str:
    return uuid.uuid4().hex


class EventTimeline(Base):
    __tablename__ = "event_timelines"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    event_name: Mapped[str] = mapped_column(String(255))
    event_type: Mapped[EventType] = mapped_column(Enum(EventType), default=EventType.wedding)
    event_date: Mapped[date] = mapped_column(Date)
    main_contact_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    main_contact_phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    assigned_vehicle: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    assigned_driver: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    assigned_driver_phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    special_instructions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Share tokens — one per audience
    share_token_driver: Mapped[str] = mapped_column(String(64), unique=True, default=_new_token)
    share_token_customer: Mapped[str] = mapped_column(String(64), unique=True, default=_new_token)
    share_token_ops: Mapped[str] = mapped_column(String(64), unique=True, default=_new_token)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    locations: Mapped[list] = relationship(
        "EventLocation", cascade="all, delete-orphan",
        order_by="EventLocation.display_order", lazy="select"
    )
    activities: Mapped[list] = relationship(
        "TimelineActivity", cascade="all, delete-orphan",
        order_by="TimelineActivity.display_order", lazy="select"
    )
