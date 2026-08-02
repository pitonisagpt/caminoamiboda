import enum
from datetime import datetime
from typing import List, Optional

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, JSON, Numeric, SmallInteger, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.vehicle_owner import VehicleOwner
from app.models.vehicle_photo import VehiclePhoto


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


class VehicleCategory(str, enum.Enum):
    clasico = "clasico"
    vintage = "vintage"
    moderno = "moderno"


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
    category: Mapped[Optional[VehicleCategory]] = mapped_column(Enum(VehicleCategory), nullable=True)
    capacity: Mapped[Optional[int]] = mapped_column(SmallInteger, nullable=True)

    location: Mapped[VehicleLocation] = mapped_column(Enum(VehicleLocation), default=VehicleLocation.medellin)
    status: Mapped[VehicleStatus] = mapped_column(Enum(VehicleStatus), default=VehicleStatus.active)

    # Legacy free-text fallback, kept only for vehicles with no matching
    # VehicleOwner (owner_id is the real relationship, see below).
    owner_name_raw: Mapped[Optional[str]] = mapped_column("owner_name", String(255), nullable=True)
    owner_contact_raw: Mapped[Optional[str]] = mapped_column("owner_contact", String(100), nullable=True)
    owner_id: Mapped[Optional[int]] = mapped_column(ForeignKey("vehicle_owners.id", ondelete="SET NULL"), nullable=True)
    owner: Mapped[Optional["VehicleOwner"]] = relationship("VehicleOwner")
    is_company_owned: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_featured: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
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
    bride_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    photo_urls: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON array

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    photos: Mapped[List["VehiclePhoto"]] = relationship(
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

    @property
    def owner_name(self) -> Optional[str]:
        return self.owner.full_name if self.owner else self.owner_name_raw

    @property
    def owner_contact(self) -> Optional[str]:
        if self.owner:
            return self.owner.whatsapp or self.owner.phone
        return self.owner_contact_raw
