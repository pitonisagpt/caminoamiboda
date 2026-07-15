from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_admin
from app.database import get_db
from app.models.reservation import Reservation, ReservationStatus
from app.models.vehicle import Vehicle, VehicleLocation, VehicleStatus, VehicleType
from app.schemas.vehicle import ReorderItem, VehicleCreate, VehicleList, VehiclePublic, VehicleRead, VehicleUpdate

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
    query = db.query(Vehicle).order_by(Vehicle.display_order)
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
    query = db.query(Vehicle).order_by(Vehicle.display_order)
    if status:
        query = query.filter(Vehicle.status == status)
    if location:
        query = query.filter(Vehicle.location == location)
    if vehicle_type:
        query = query.filter(Vehicle.vehicle_type == vehicle_type)
    return _serialize_list(query.all())


@router.put("/reorder", dependencies=[Depends(require_admin)])
def reorder_vehicles(items: List[ReorderItem], db: Session = Depends(get_db)):
    for item in items:
        db.query(Vehicle).filter(Vehicle.id == item.id).update({"display_order": item.display_order})
    db.commit()
    return {"ok": True}


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


@router.get("/{vehicle_id}/stats", dependencies=[Depends(get_current_user)])
def vehicle_stats(
    vehicle_id: int,
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: Session = Depends(get_db),
):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")

    today = date.today()

    def _df(filters=None):
        f = [Reservation.vehicle_id == vehicle_id] + (filters or [])
        if date_from:
            f.append(Reservation.event_date >= date_from)
        if date_to:
            f.append(Reservation.event_date <= date_to)
        return f

    all_res = db.query(Reservation).filter(*_df()).all()
    completed = [r for r in all_res if r.status == ReservationStatus.completed]
    upcoming = [r for r in all_res if r.event_date > today and r.status not in (ReservationStatus.cancelled, ReservationStatus.completed)]

    total_rev = float(sum(r.total_amount for r in completed) or 0)
    comp_count = len(completed)

    all_dates = [r.event_date for r in all_res]
    summary = {
        "total_events": len(all_res),
        "completed_events": comp_count,
        "upcoming_count": len(upcoming),
        "total_revenue": total_rev,
        "company_share": round(total_rev) if vehicle.is_company_owned else round(total_rev * 0.30),
        "avg_revenue_per_event": round(total_rev / comp_count) if comp_count else 0,
        "first_event_date": min(all_dates).isoformat() if all_dates else None,
        "last_event_date": max(d for d in all_dates if d <= today).isoformat() if any(d <= today for d in all_dates) else None,
    }

    # Monthly trend (completed only)
    monthly_map: dict = {}
    for r in completed:
        key = r.event_date.strftime("%Y-%m")
        if key not in monthly_map:
            monthly_map[key] = {"month": key, "revenue": 0.0, "count": 0}
        monthly_map[key]["revenue"] += float(r.total_amount)
        monthly_map[key]["count"] += 1
    monthly_trend = sorted(monthly_map.values(), key=lambda x: x["month"])

    # Status breakdown
    STATUS_LABELS = {
        "lead": "Lead", "quoted": "Cotizado", "deposit_received": "Abono",
        "reserved": "Reservado", "confirmed": "Confirmado",
        "completed": "Completado", "cancelled": "Cancelado",
    }
    status_map: dict = {}
    for r in all_res:
        s = r.status if isinstance(r.status, str) else r.status.value
        status_map[s] = status_map.get(s, 0) + 1
    status_breakdown = [
        {"status": s, "label": STATUS_LABELS.get(s, s), "count": c}
        for s, c in sorted(status_map.items(), key=lambda x: x[1], reverse=True)
    ]

    # Seasonality (all non-cancelled)
    MONTH_LABELS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]
    season_map: dict = {m: 0 for m in range(1, 13)}
    for r in completed:
        season_map[r.event_date.month] += 1
    seasonality = [{"month": m, "label": MONTH_LABELS[m-1], "count": season_map[m]} for m in range(1, 13)]

    # Recent events (last 10, sorted desc)
    recent_sorted = sorted(
        [r for r in all_res if r.event_date <= today],
        key=lambda r: r.event_date,
        reverse=True,
    )[:10]
    recent_events = [
        {
            "id": r.id,
            "reservation_number": r.reservation_number,
            "title": r.display_customer,
            "date": r.event_date.isoformat(),
            "status": r.status if isinstance(r.status, str) else r.status.value,
            "total_amount": float(r.total_amount),
        }
        for r in recent_sorted
    ]

    return {
        "summary": summary,
        "monthly_trend": monthly_trend,
        "status_breakdown": status_breakdown,
        "seasonality": seasonality,
        "recent_events": recent_events,
    }
