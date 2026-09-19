from datetime import date

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.core.limiter import limiter
from app.database import get_db
from app.models.vehicle import Vehicle, VehicleStatus
from app.services.conflicts import find_conflicts

router = APIRouter(prefix="/api/public", tags=["public-availability"], redirect_slashes=False)


@router.get("/availability")
@limiter.limit("30/minute")
def public_availability(request: Request, event_date: date = Query(..., alias="date"), db: Session = Depends(get_db)):
    """Which active vehicles are free on a given date — for the catalog's
    date picker (mejoras.md item 1: real availability, not just a WhatsApp
    message with the date in it).

    Reuses find_conflicts() (the same logic the admin calendar/reservation
    form use to prevent double-booking) rather than a second implementation
    of "what counts as a blocking reservation" — a public endpoint that
    disagreed with the admin one would be worse than no endpoint at all.
    Deliberately returns only vehicle ids, never find_conflicts()'s raw
    `message`/`reservation_number` fields — those reference customer names,
    not safe to expose unauthenticated.
    """
    vehicle_ids = [v.id for v in db.query(Vehicle.id).filter(Vehicle.status == VehicleStatus.active).all()]
    conflicts = find_conflicts(db, event_date=event_date, vehicle_ids=vehicle_ids, driver_ids=[])

    unavailable: set[int] = set()
    for c in conflicts:
        if c["type"] == "vehicle" and c["severity"] == "blocking":
            unavailable.update(c.get("vehicle_ids", []))

    return {
        "date": event_date.isoformat(),
        "unavailable_vehicle_ids": sorted(unavailable),
    }
