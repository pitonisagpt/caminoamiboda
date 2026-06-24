from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_admin
from app.database import get_db
from app.models.vehicle import Vehicle, VehicleLocation, VehicleStatus, VehicleType
from app.models.user import User
from app.schemas.vehicle import VehicleCreate, VehicleList, VehiclePublic, VehicleRead, VehicleUpdate

router = APIRouter(prefix="/api/vehicles", tags=["vehicles"], redirect_slashes=False)


def _serialize_list(vehicles) -> list:
    return [VehicleList.from_orm_with_pico(v) for v in vehicles]


@router.get("", response_model=List[VehicleList])
def list_vehicles(
    status: Optional[VehicleStatus] = Query(None),
    location: Optional[VehicleLocation] = Query(None),
    vehicle_type: Optional[VehicleType] = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(Vehicle).order_by(Vehicle.brand, Vehicle.model_line)
    if status:
        query = query.filter(Vehicle.status == status)
    else:
        # Public default: only active. Callers with a token can pass status explicitly.
        query = query.filter(Vehicle.status == VehicleStatus.active)
    if location:
        query = query.filter(Vehicle.location == location)
    if vehicle_type:
        query = query.filter(Vehicle.vehicle_type == vehicle_type)
    return _serialize_list(query.all())


@router.get("/all", response_model=List[VehicleList], dependencies=[Depends(get_current_user)])
def list_all_vehicles(
    status: Optional[VehicleStatus] = Query(None),
    location: Optional[VehicleLocation] = Query(None),
    vehicle_type: Optional[VehicleType] = Query(None),
    db: Session = Depends(get_db),
):
    """Admin endpoint that returns all vehicles regardless of status."""
    query = db.query(Vehicle).order_by(Vehicle.brand, Vehicle.model_line)
    if status:
        query = query.filter(Vehicle.status == status)
    if location:
        query = query.filter(Vehicle.location == location)
    if vehicle_type:
        query = query.filter(Vehicle.vehicle_type == vehicle_type)
    return _serialize_list(query.all())


@router.get("/{vehicle_id}", response_model=VehiclePublic)
def get_vehicle(vehicle_id: int, db: Session = Depends(get_db)):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    return VehiclePublic.from_orm_with_pico(vehicle)


@router.post("", response_model=VehicleRead, dependencies=[Depends(require_admin)], status_code=201)
def create_vehicle(payload: VehicleCreate, db: Session = Depends(get_db)):
    if db.query(Vehicle).filter(Vehicle.license_plate == payload.license_plate.upper()).first():
        raise HTTPException(status_code=409, detail="Ya existe un vehículo con esa placa")
    vehicle = Vehicle(**payload.model_dump())
    vehicle.license_plate = vehicle.license_plate.upper()
    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)
    return VehicleRead.from_orm_with_pico(vehicle)


@router.put("/{vehicle_id}", response_model=VehicleRead, dependencies=[Depends(require_admin)])
def update_vehicle(vehicle_id: int, payload: VehicleUpdate, db: Session = Depends(get_db)):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    for field, value in payload.model_dump(exclude_unset=True).items():
        if field == "license_plate" and value:
            value = value.upper()
        setattr(vehicle, field, value)
    db.commit()
    db.refresh(vehicle)
    return VehicleRead.from_orm_with_pico(vehicle)


@router.delete("/{vehicle_id}", dependencies=[Depends(require_admin)], status_code=204)
def delete_vehicle(vehicle_id: int, db: Session = Depends(get_db)):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    vehicle.status = VehicleStatus.inactive
    db.commit()
