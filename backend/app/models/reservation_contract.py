import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.vehicle_owner_contract import ContractStatus


class ClientType(str, enum.Enum):
    individual = "individual"
    company = "company"


class IdType(str, enum.Enum):
    CC = "CC"
    NIT = "NIT"


class ReservationContract(Base):
    """The customer-facing rental contract ("Contrato de Arrendamiento de
    Vehículo para Eventos y Actividades Especiales") per reservation —
    company <-> customer, a sibling of but distinct from
    VehicleOwnerContract (company <-> vehicle owner). One per reservation,
    regenerated in place on each "Regenerar PDF", same as
    VehicleOwnerContract — editing this row's fields then regenerating IS
    the edit workflow, there is no separate draft/history trail.

    Carries its own copy of the ARRENDATARIO's legal-identity fields — same
    reasoning BillingDocument.client_* has its own copy instead of reading
    Customer live: the two identities can legitimately differ (e.g. a
    wedding planner contracts on behalf of the couple).
    """

    __tablename__ = "reservation_contracts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    reservation_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("reservations.id", ondelete="CASCADE"), unique=True, index=True
    )
    contract_number: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    status: Mapped[ContractStatus] = mapped_column(Enum(ContractStatus), default=ContractStatus.draft)

    # ARRENDATARIO identity — own copy, pre-filled from reservation.customer
    # when the row is first created (see router), independently editable
    # afterwards.
    client_type: Mapped[ClientType] = mapped_column(Enum(ClientType), default=ClientType.individual)
    client_name: Mapped[str] = mapped_column(String(255))
    client_legal_rep_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    # BillingDocument has no equivalent — the legal rep's own cédula, needed
    # for the "Representante legal ..., C.C. [●]" signature line.
    client_legal_rep_id_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    client_id_type: Mapped[IdType] = mapped_column(Enum(IdType), default=IdType.CC)
    client_id_number: Mapped[str] = mapped_column(String(50))

    # Free-text clause SEGUNDA slots with no other home in the schema.
    authorized_use: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    special_conditions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    pdf_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
