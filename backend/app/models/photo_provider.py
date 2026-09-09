from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class PhotoProvider(Base):
    """Directory of external collaborators who can be credited on a
    catalog photo (photographers primarily, but open-ended — decorators,
    planners, venues, etc.) — see vehicle_photo_provider.py for the
    many-to-many link to VehiclePhoto. `category` is free text on purpose:
    the set of provider types is open-ended and not worth an enum."""

    __tablename__ = "photo_providers"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    category: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    instagram_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    website_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
