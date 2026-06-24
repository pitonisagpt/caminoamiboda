from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_admin
from app.database import get_db
from app.models.vehicle_owner import VehicleOwner
from app.schemas.vehicle_owner import VehicleOwnerCreate, VehicleOwnerRead, VehicleOwnerUpdate

router = APIRouter(prefix="/api/vehicle-owners", tags=["vehicle_owners"], redirect_slashes=False, dependencies=[Depends(require_admin)])


@router.get("", response_model=List[VehicleOwnerRead])
def list_owners(search: Optional[str] = Query(None), db: Session = Depends(get_db)):
    q = db.query(VehicleOwner).order_by(VehicleOwner.full_name)
    if search:
        like = f"%{search}%"
        q = q.filter(VehicleOwner.full_name.ilike(like) | VehicleOwner.phone.ilike(like))
    return q.all()


@router.post("", response_model=VehicleOwnerRead, status_code=201)
def create_owner(body: VehicleOwnerCreate, db: Session = Depends(get_db)):
    owner = VehicleOwner(**body.model_dump())
    db.add(owner)
    db.commit()
    db.refresh(owner)
    return owner


@router.get("/{owner_id}", response_model=VehicleOwnerRead)
def get_owner(owner_id: int, db: Session = Depends(get_db)):
    owner = db.query(VehicleOwner).filter(VehicleOwner.id == owner_id).first()
    if not owner:
        raise HTTPException(404, "Propietario no encontrado")
    return owner


@router.put("/{owner_id}", response_model=VehicleOwnerRead)
def update_owner(owner_id: int, body: VehicleOwnerUpdate, db: Session = Depends(get_db)):
    owner = db.query(VehicleOwner).filter(VehicleOwner.id == owner_id).first()
    if not owner:
        raise HTTPException(404, "Propietario no encontrado")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(owner, field, value)
    db.commit()
    db.refresh(owner)
    return owner


@router.delete("/{owner_id}", status_code=204)
def delete_owner(owner_id: int, db: Session = Depends(get_db)):
    owner = db.query(VehicleOwner).filter(VehicleOwner.id == owner_id).first()
    if not owner:
        raise HTTPException(404, "Propietario no encontrado")
    db.delete(owner)
    db.commit()
