from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class FloristSettings(Base):
    __tablename__ = "florist_settings"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    vendor_name: Mapped[str] = mapped_column(String(120), default="Lluvia de Rosas")
    description: Mapped[str] = mapped_column(Text)
    description_en: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    whatsapp_number: Mapped[str] = mapped_column(String(20))
    whatsapp_message: Mapped[str] = mapped_column(Text)
    instagram_url: Mapped[str] = mapped_column(String(255))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
