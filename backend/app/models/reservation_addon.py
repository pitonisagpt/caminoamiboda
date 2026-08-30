from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ReservationAddon(Base):
    """A third-party service sold alongside a reservation (ramo, letrero,
    decoración, etc.) that must NOT share the vehicle's owner/company split —
    e.g. a florist service where Camino a mi Boda just passes the money
    through (or doesn't even collect it) and keeps 0%, while the vehicle
    itself keeps the normal 70/30.

    Same idiom as ReservationVehicle: small child table with a FK +
    display_order. Query this directly (db.query(ReservationAddon)...)
    rather than via any ORM collection relationship on Reservation — this
    codebase has repeated warnings that cascade+order_by relationships of
    this shape don't reliably behave as a live list.
    """

    __tablename__ = "reservation_addons"

    id: Mapped[int] = mapped_column(primary_key=True)
    reservation_id: Mapped[int] = mapped_column(
        ForeignKey("reservations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # Optional link to the flat AddonPackage catalog (Ramo Básico/Estándar/
    # Premium, Hora Adicional) — used only to prefill name/price/description
    # when creating one of these. Never required: real prices here are
    # usually negotiated per event and don't match a catalog tier.
    addon_package_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("addon_packages.id", ondelete="SET NULL"), nullable=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    provider_name: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    # % that Camino a mi Boda keeps from THIS service — independent of the
    # vehicle's split. Usually 0 for a third-party service like the florist
    # (the point is giving them work, not margin); can be >0 for a service
    # that genuinely earns the company revenue. provider_percentage is
    # derived as 100 - this, never stored separately (same pattern as
    # OwnerSettlement.owner_percentage -> company_amount).
    company_percentage: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    # Does Camino a mi Boda actually collect the client's payment for this
    # service, or does the client pay the provider directly? "A veces sí, a
    # veces no."
    company_collects_payment: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    addon_package = relationship("AddonPackage", foreign_keys=[addon_package_id], lazy="select")
