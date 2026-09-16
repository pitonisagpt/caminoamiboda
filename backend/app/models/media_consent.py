from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.vehicle_owner_contract import ContractStatus


class MediaConsent(Base):
    """Standalone "Autorización de Uso de Imagen, Video, Audio y Tratamiento
    de Datos Personales" per reservation — deliberately NOT part of
    ReservationContract (same PDF/WhatsApp/status pattern, but its own
    table, numbering, and template). The owner was explicit that this
    authorization cannot be tied to the vehicle rental contract: a couple
    must be able to rent the car without being forced to authorize use of
    their photos/video/audio on the website or social media. Nothing else
    in the system reads this row — it's purely additive (wishlist fila 70).

    Two signers (bride + groom), not one "client" like ReservationContract
    — this is inherently a personal image-rights document, not a
    company/individual rental party. Own copy of names/id numbers, same
    reasoning as ReservationContract's client_* fields: pre-filled from
    Customer but independently editable afterwards.

    No "signed" status: ContractStatus only has draft/sent (same as
    ReservationContract and VehicleOwnerContract) — nothing in this app
    tracks real signature status yet. Evidence of signature is the scanned
    copy ops uploads as a ReservationAttachment (category "media_consent"),
    not a field on this row.
    """

    __tablename__ = "media_consents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    reservation_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("reservations.id", ondelete="CASCADE"), unique=True, index=True
    )
    consent_number: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    status: Mapped[ContractStatus] = mapped_column(Enum(ContractStatus), default=ContractStatus.draft)

    bride_name: Mapped[str] = mapped_column(String(255))
    bride_id_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    groom_name: Mapped[str] = mapped_column(String(255))
    groom_id_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    pdf_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
