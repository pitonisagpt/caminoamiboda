import json
import re
import time
import urllib.parse
import urllib.request
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select as sa_select
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.catalog_location import CatalogLocation
from app.models.event_location import EventLocation, LocationType
from app.models.event_timeline import EventTimeline
from app.schemas.catalog_location import CatalogLocationCreate, CatalogLocationRead, CatalogLocationUpdate

_UA = "CaminoAMiBoda/1.0 (reservations system; contact@caminoamiboda.com)"


def _follow_maps_link(url: str) -> tuple[float, float] | None:
    """Follow a Google Maps short/full link and extract @lat,lng from the final URL."""
    try:
        req = urllib.request.Request(url, headers={"User-Agent": _UA})
        with urllib.request.urlopen(req, timeout=8) as resp:
            final_url = resp.url
        m = re.search(r'@(-?\d+\.\d+),(-?\d+\.\d+)', final_url)
        if m:
            return float(m.group(1)), float(m.group(2))
    except Exception:
        pass
    return None


def _nominatim(query: str) -> tuple[float, float] | None:
    try:
        url = (
            "https://nominatim.openstreetmap.org/search"
            f"?q={urllib.parse.quote(query)}&format=json&limit=1&countrycodes=co"
        )
        req = urllib.request.Request(url, headers={"User-Agent": _UA})
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read())
        if data:
            return float(data[0]["lat"]), float(data[0]["lon"])
    except Exception:
        pass
    return None


def _geocode(loc: CatalogLocation) -> tuple[float, float] | None:
    if loc.google_maps_link:
        result = _follow_maps_link(loc.google_maps_link)
        if result:
            return result
    queries = []
    if loc.address:
        queries.append(f"{loc.name}, {loc.address}")
    queries += [
        f"{loc.name}, Medellín, Colombia",
        f"{loc.name}, Antioquia, Colombia",
        f"{loc.name}, Colombia",
        loc.name,
    ]
    for q in queries:
        try:
            result = _nominatim(q)
            if result:
                return result
            time.sleep(1.1)
        except Exception:
            time.sleep(1.1)
    return None

router = APIRouter(
    prefix="/api/catalog-locations",
    tags=["catalog-locations"],
    redirect_slashes=False,
    dependencies=[Depends(get_current_user)],
)


def _get_or_404(loc_id: int, db: Session) -> CatalogLocation:
    loc = db.get(CatalogLocation, loc_id)
    if not loc:
        raise HTTPException(404, "Ubicación no encontrada")
    return loc


@router.get("", response_model=List[CatalogLocationRead])
def list_catalog_locations(
    q: Optional[str] = Query(None),
    type: Optional[LocationType] = Query(None),
    db: Session = Depends(get_db),
):
    # Count distinct reservations, not raw EventLocation rows — a single wedding can
    # reuse the same location twice (e.g. pickup and reception both at "Club el Prado"),
    # which should still count as one use, matching /reservations?location_id filtering.
    usage_sq = (
        sa_select(func.count(func.distinct(EventTimeline.reservation_id)))
        .select_from(EventLocation)
        .join(EventTimeline, EventTimeline.id == EventLocation.timeline_id)
        .where(func.lower(EventLocation.location_name) == func.lower(CatalogLocation.name))
        .correlate(CatalogLocation)
        .scalar_subquery()
    )

    query = db.query(CatalogLocation, usage_sq.label("usage_count"))
    if q:
        like = f"%{q}%"
        query = query.filter(
            or_(CatalogLocation.name.ilike(like), CatalogLocation.address.ilike(like))
        )
    if type:
        query = query.filter(CatalogLocation.location_type == type)

    rows = query.order_by(CatalogLocation.name).all()
    result = []
    for loc, count in rows:
        d = {c.key: getattr(loc, c.key) for c in loc.__table__.columns}
        d["usage_count"] = count or 0
        result.append(d)
    return result


@router.post("", response_model=CatalogLocationRead, status_code=201)
def create_catalog_location(data: CatalogLocationCreate, db: Session = Depends(get_db)):
    loc = CatalogLocation(**data.model_dump())
    db.add(loc)
    db.commit()
    db.refresh(loc)
    return loc


@router.get("/{loc_id}", response_model=CatalogLocationRead)
def get_catalog_location(loc_id: int, db: Session = Depends(get_db)):
    return _get_or_404(loc_id, db)


@router.put("/{loc_id}", response_model=CatalogLocationRead)
def update_catalog_location(loc_id: int, data: CatalogLocationUpdate, db: Session = Depends(get_db)):
    loc = _get_or_404(loc_id, db)
    old_name = loc.name
    update_fields = data.model_dump(exclude_unset=True)

    for k, v in update_fields.items():
        setattr(loc, k, v)

    # Re-geocode when the address/name/link changed but coordinates weren't explicitly
    # supplied — otherwise editing an address silently leaves the map pin in the old spot.
    geocode_triggers = {"address", "google_maps_link", "name"}
    if geocode_triggers & update_fields.keys() and not ({"lat", "lng"} & update_fields.keys()):
        coords = _geocode(loc)
        if coords:
            loc.lat, loc.lng = coords
            update_fields["lat"], update_fields["lng"] = coords

    # Propagate corrections to already-created EventLocation rows matched by the OLD name
    # (case-insensitive, so a rename is still found) — same name-matching convention sync_to_catalog uses.
    propagate_keys = {"name", "address", "google_maps_link", "lat", "lng"}
    if propagate_keys & update_fields.keys():
        event_updates: dict = {}
        if "name" in update_fields:
            event_updates["location_name"] = loc.name
        if "address" in update_fields:
            event_updates["address"] = loc.address
        if "google_maps_link" in update_fields:
            event_updates["google_maps_link"] = loc.google_maps_link
        if "lat" in update_fields:
            event_updates["lat"] = loc.lat
        if "lng" in update_fields:
            event_updates["lng"] = loc.lng

        db.query(EventLocation).filter(
            func.lower(EventLocation.location_name) == old_name.strip().lower()
        ).update(event_updates, synchronize_session=False)

    db.commit()
    db.refresh(loc)
    return loc


@router.delete("/{loc_id}", status_code=204)
def delete_catalog_location(loc_id: int, db: Session = Depends(get_db)):
    loc = _get_or_404(loc_id, db)
    db.delete(loc)
    db.commit()


def sync_to_catalog(db: Session, event_location: "EventLocation") -> CatalogLocation:
    """Upsert an event location into the catalog by name, then geocode if missing coords."""
    key = event_location.location_name.strip().lower()
    existing = db.query(CatalogLocation).filter(
        CatalogLocation.name.ilike(key)
    ).first()
    if existing is None:
        existing = CatalogLocation(
            name=event_location.location_name.strip(),
            location_type=event_location.location_type,
            address=event_location.address,
            google_maps_link=event_location.google_maps_link,
            contact_person=event_location.contact_person,
            contact_phone=event_location.contact_phone,
            notes=event_location.notes,
        )
        db.add(existing)
        db.flush()  # get id without committing
    # Geocode if coordinates are missing
    if existing.lat is None or existing.lng is None:
        coords = _geocode(existing)
        if coords:
            existing.lat, existing.lng = coords
    return existing


@router.post("/resolve-coords", response_model=dict)
def resolve_coords(db: Session = Depends(get_db)):
    """Geocode all catalog locations that don't yet have lat/lng coordinates.
    Uses Google Maps link following first, then Nominatim as fallback.
    Runs synchronously — may take a few seconds per location."""
    locs = db.query(CatalogLocation).filter(
        (CatalogLocation.lat == None) | (CatalogLocation.lng == None)  # noqa: E711
    ).all()

    resolved = 0
    for loc in locs:
        coords = _geocode(loc)
        if coords:
            loc.lat, loc.lng = coords
            resolved += 1

    db.commit()
    return {"resolved": resolved, "total": len(locs)}
