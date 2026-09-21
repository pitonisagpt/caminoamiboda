from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.dependencies import require_admin
from app.core.limiter import limiter
from app.database import get_db
from app.models.vehicle import Vehicle
from app.schemas.vehicle_ai import VehicleAiGenerateResponse
from app.services.vehicle_ai_service import VehicleAiError, generate_vehicle_ai_content

router = APIRouter(prefix="/api/vehicles", tags=["vehicle-ai"], dependencies=[Depends(require_admin)], redirect_slashes=False)


@router.post("/{vehicle_id}/generate-ai", response_model=VehicleAiGenerateResponse)
@limiter.limit("10/minute;60/hour")
def generate_ai_content(request: Request, vehicle_id: int, db: Session = Depends(get_db)):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    try:
        result = generate_vehicle_ai_content(db, vehicle)
    except VehicleAiError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail) from e
    return VehicleAiGenerateResponse(**result)
