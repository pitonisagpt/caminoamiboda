from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.reservation import Reservation
from app.models.reservation_addon import ReservationAddon
from app.models.reservation_addon_payment import ReservationAddonPayment
from app.schemas.reservation_addon import ReservationAddonCreate, ReservationAddonRead, ReservationAddonUpdate
from app.services.reservation_addons import get_reservation_addons

# Open to any authenticated user, not admin-gated — this backend has no
# granular permission system (see CLAUDE.md): "operations" is enforced by
# what the frontend shows/hides, exactly like the vehicle owner split
# already works. The frontend keeps this section inside its admin-only
# block in FinanceTab.tsx.
router = APIRouter(
    prefix="/api/reservations",
    tags=["reservation-addons"],
    dependencies=[Depends(get_current_user)],
    redirect_slashes=False,
)


def _get_reservation(reservation_id: int, db: Session) -> Reservation:
    reservation = db.query(Reservation).filter(Reservation.id == reservation_id).first()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    return reservation


def _get_addon(reservation_id: int, addon_id: int, db: Session) -> ReservationAddon:
    addon = (
        db.query(ReservationAddon)
        .filter(ReservationAddon.id == addon_id, ReservationAddon.reservation_id == reservation_id)
        .first()
    )
    if not addon:
        raise HTTPException(status_code=404, detail="Servicio adicional no encontrado")
    return addon


@router.get("/{reservation_id}/addons", response_model=List[ReservationAddonRead])
def list_addons(reservation_id: int, db: Session = Depends(get_db)):
    _get_reservation(reservation_id, db)
    return [ReservationAddonRead.build(a) for a in get_reservation_addons(reservation_id, db)]


@router.post("/{reservation_id}/addons", response_model=ReservationAddonRead, status_code=201)
def create_addon(reservation_id: int, body: ReservationAddonCreate, db: Session = Depends(get_db)):
    _get_reservation(reservation_id, db)
    max_order = db.query(ReservationAddon).filter(ReservationAddon.reservation_id == reservation_id).count()
    addon = ReservationAddon(
        reservation_id=reservation_id,
        display_order=max_order,
        **body.model_dump(),
    )
    db.add(addon)
    db.commit()
    db.refresh(addon)
    return ReservationAddonRead.build(addon)


@router.put("/{reservation_id}/addons/{addon_id}", response_model=ReservationAddonRead)
def update_addon(reservation_id: int, addon_id: int, body: ReservationAddonUpdate, db: Session = Depends(get_db)):
    addon = _get_addon(reservation_id, addon_id, db)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(addon, field, value)
    db.commit()
    db.refresh(addon)
    return ReservationAddonRead.build(addon)


@router.delete("/{reservation_id}/addons/{addon_id}", status_code=204)
def delete_addon(reservation_id: int, addon_id: int, db: Session = Depends(get_db)):
    addon = _get_addon(reservation_id, addon_id, db)
    db.delete(addon)
    db.commit()


# ── Addon Payments ───────────────────────────────────────────────────────────
# Same pattern as owner_settlements.py's "Settlement Payments" section — a
# payment actually made toward this addon's provider_amount (see
# ReservationAddon.remaining_to_provider), which the addon itself never
# tracked before (wishlist fila 35).

class AddonPaymentCreate(BaseModel):
    amount: Decimal
    paid_at: date
    notes: Optional[str] = None


class AddonPaymentRead(BaseModel):
    id: int
    addon_id: int
    amount: Decimal
    paid_at: date
    notes: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


@router.get("/{reservation_id}/addons/{addon_id}/payments", response_model=List[AddonPaymentRead])
def list_addon_payments(reservation_id: int, addon_id: int, db: Session = Depends(get_db)):
    addon = _get_addon(reservation_id, addon_id, db)
    return addon.payments


@router.post("/{reservation_id}/addons/{addon_id}/payments", response_model=AddonPaymentRead, status_code=201)
def add_addon_payment(reservation_id: int, addon_id: int, body: AddonPaymentCreate, db: Session = Depends(get_db)):
    _get_addon(reservation_id, addon_id, db)
    payment = ReservationAddonPayment(
        addon_id=addon_id,
        amount=body.amount,
        paid_at=body.paid_at,
        notes=body.notes,
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment


@router.delete("/{reservation_id}/addons/{addon_id}/payments/{payment_id}", status_code=204)
def delete_addon_payment(reservation_id: int, addon_id: int, payment_id: int, db: Session = Depends(get_db)):
    _get_addon(reservation_id, addon_id, db)
    payment = db.query(ReservationAddonPayment).filter(
        ReservationAddonPayment.id == payment_id,
        ReservationAddonPayment.addon_id == addon_id,
    ).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Pago no encontrado")
    db.delete(payment)
    db.commit()
