from datetime import date, datetime
from typing import Optional

from sqlalchemy import Boolean, Date, DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class AiAssistantStatus(Base):
    """Singleton row (id always 1). Tracks only the true circuit breaker —
    auth_error / billing_error / repeated_errors. Never auto-clears; requires
    the admin "Reintentar" action. The daily message budget is NOT stored
    here — see AiAssistantUsage, which is checked live so it resets itself at
    midnight with no admin action needed."""
    __tablename__ = "ai_assistant_status"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    disabled_reason: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    disabled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    disabled_detail: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    consecutive_error_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_error_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_reenable_check_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_reenable_result: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class AiAssistantUsage(Base):
    """One row per calendar date. Counts real Anthropic calls (not status
    probes) toward AI_ASSISTANT_DAILY_MESSAGE_BUDGET."""
    __tablename__ = "ai_assistant_usage"

    usage_date: Mapped[date] = mapped_column(Date, primary_key=True)
    message_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
