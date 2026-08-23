import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ContractStatus(str, enum.Enum):
    draft = "draft"
    sent = "sent"


class VehicleOwnerContract(Base):
    """The one master framework contract ("contrato marco") per vehicle owner.

    Not per-event — the per-event "orden de servicio" is a separate,
    not-yet-built concept. Regenerating the PDF re-renders from the
    owner's/company's current data instead of creating a new record.
    """

    __tablename__ = "vehicle_owner_contracts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    owner_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("vehicle_owners.id", ondelete="CASCADE"), unique=True, index=True
    )
    contract_number: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    status: Mapped[ContractStatus] = mapped_column(Enum(ContractStatus), default=ContractStatus.draft)
    pdf_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
