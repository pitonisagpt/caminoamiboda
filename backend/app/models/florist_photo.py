from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class FloristPhoto(Base):
    __tablename__ = "florist_photos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    file_name: Mapped[str] = mapped_column(String(255), unique=True)
    original_name: Mapped[str] = mapped_column(String(255))
    label: Mapped[str] = mapped_column(String(120), default="")
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    is_visible: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
