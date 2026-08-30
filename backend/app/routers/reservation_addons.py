from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.reservation import Reservation
from app.models.reservation_addon import ReservationAddon
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
