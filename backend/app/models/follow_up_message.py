from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class FollowUpMessage(Base):
    """Tracks which of the quote-follow-up WhatsApp templates has been
    sent for a given (still-quoted) reservation. A row only exists once a
    template has been marked sent — nothing is pre-seeded.
    """

    __tablename__ = "follow_up_messages"
    __table_args__ = (UniqueConstraint("reservation_id", "template_key", name="uq_follow_up_reservation_template"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    reservation_id: Mapped[int] = mapped_column(ForeignKey("reservations.id", ondelete="CASCADE"), nullable=False)
    template_key: Mapped[str] = mapped_column(String(10), nullable=False)
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
