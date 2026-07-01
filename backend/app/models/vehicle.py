import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, Column, DateTime, Enum, Integer, JSON, Numeric, SmallInteger, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class VehicleType(str, enum.Enum):
    car = "car"
    motorcycle = "motorcycle"


class VehicleStatus(str, enum.Enum):
    active = "active"
    inactive = "inactive"
    pending = "pending"


class VehicleLocation(str, enum.Enum):
    medellin = "medellin"
    rionegro = "rionegro"
    carmen_de_viboral = "carmen_de_viboral"


class Vehicle(Base):
    __tablename__ = "vehicles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    license_plate: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    brand: Mapped[str] = mapped_column(String(100))
    model_line: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    color: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    year: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    vehicle_type: Mapped[VehicleType] = mapped_column(Enum(VehicleType), default=VehicleType.car)
    body_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    capacity: Mapped[Optional[int]] = mapped_column(SmallInteger, nullable=True)

    location: Mapped[VehicleLocation] = mapped_column(Enum(VehicleLocation), default=VehicleLocation.medellin)
    status: Mapped[VehicleStatus] = mapped_column(Enum(VehicleStatus), default=VehicleStatus.active)

    owner_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    owner_contact: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    is_company_owned: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    allowed_locations: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)

    price_medellin: Mapped[Optional[float]] = mapped_column(Numeric(12, 2), nullable=True)
    price_rionegro: Mapped[Optional[float]] = mapped_column(Numeric(12, 2), nullable=True)

    score_elegance: Mapped[Optional[int]] = mapped_column(SmallInteger, nullable=True)
    score_exclusivity: Mapped[Optional[int]] = mapped_column(SmallInteger, nullable=True)
    score_photogeny: Mapped[Optional[int]] = mapped_column(SmallInteger, nullable=True)
    score_comfort: Mapped[Optional[int]] = mapped_column(SmallInteger, nullable=True)
    score_romance: Mapped[Optional[int]] = mapped_column(SmallInteger, nullable=True)

    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    pyp_day_override: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    pyp_valid_from: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=False), nullable=True)
    pyp_valid_to: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=False), nullable=True)

    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    photo_urls: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON array

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    photos: Mapped[list] = relationship(
        "VehiclePhoto",
        cascade="all, delete-orphan",
        order_by="VehiclePhoto.display_order.asc()",
        lazy="select",
        uselist=True,
    )

    @property
    def score_total(self) -> Optional[int]:
        scores = [self.score_elegance, self.score_exclusivity, self.score_photogeny,
                  self.score_comfort, self.score_romance]
        if all(s is not None for s in scores):
            return sum(scores)
        return None
