from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.driver import Driver, DriverStatus
from app.schemas.driver import DriverCreate, DriverRead, DriverUpdate

router = APIRouter(prefix="/api/drivers", tags=["drivers"], redirect_slashes=False, dependencies=[Depends(get_current_user)])


@router.get("", response_model=List[DriverRead])
def list_drivers(
    status: Optional[DriverStatus] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(Driver).order_by(Driver.full_name)
    if status:
        q = q.filter(Driver.status == status)
    if search:
        like = f"%{search}%"
        q = q.filter(Driver.full_name.ilike(like) | Driver.phone.ilike(like))
    return q.all()


@router.post("", response_model=DriverRead, status_code=201)
def create_driver(body: DriverCreate, db: Session = Depends(get_db)):
    driver = Driver(**body.model_dump())
    db.add(driver)
    db.commit()
    db.refresh(driver)
    return driver


@router.get("/{driver_id}", response_model=DriverRead)
def get_driver(driver_id: int, db: Session = Depends(get_db)):
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(404, "Conductor no encontrado")
    return driver


@router.put("/{driver_id}", response_model=DriverRead)
def update_driver(driver_id: int, body: DriverUpdate, db: Session = Depends(get_db)):
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(404, "Conductor no encontrado")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(driver, field, value)
    db.commit()
    db.refresh(driver)
    return driver


@router.delete("/{driver_id}", status_code=204)
def delete_driver(driver_id: int, db: Session = Depends(get_db)):
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(404, "Conductor no encontrado")
    db.delete(driver)
    db.commit()
