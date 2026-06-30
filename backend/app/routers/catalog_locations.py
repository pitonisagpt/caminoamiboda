import json
import re
import time
import urllib.parse
import urllib.request
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.catalog_location import CatalogLocation
from app.models.event_location import EventLocation, LocationType
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
            f"?q={urllib.parse.quote(query)}&format=json&limit=1"
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
    ]
    for q in queries:
        result = _nominatim(q)
        if result:
            return result
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
    query = db.query(CatalogLocation)
    if q:
        like = f"%{q}%"
        query = query.filter(
            or_(CatalogLocation.name.ilike(like), CatalogLocation.address.ilike(like))
        )
    if type:
        query = query.filter(CatalogLocation.location_type == type)
    return query.order_by(CatalogLocation.name).all()


@router.post("", response_model=CatalogLocationRead, status_code=201)
def create_catalog_location(data: CatalogLocationCreate, db: Session = Depends(get_db)):
    loc = CatalogLocation(**data.model_dump())
    db.add(loc)
    db.commit()
    db.refresh(loc)
    return loc


@router.put("/{loc_id}", response_model=CatalogLocationRead)
def update_catalog_location(loc_id: int, data: CatalogLocationUpdate, db: Session = Depends(get_db)):
    loc = _get_or_404(loc_id, db)
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(loc, k, v)
    db.commit()
    db.refresh(loc)
    return loc


@router.delete("/{loc_id}", status_code=204)
def delete_catalog_location(loc_id: int, db: Session = Depends(get_db)):
    loc = _get_or_404(loc_id, db)
    db.delete(loc)
    db.commit()


@router.post("/import-from-events", response_model=dict)
def import_from_events(db: Session = Depends(get_db)):
    """Import unique locations from all event timelines into the catalog (skip duplicates by name)."""
    existing_names = {r[0].lower() for r in db.query(CatalogLocation.name).all()}
    event_locs = db.query(EventLocation).order_by(EventLocation.location_name).all()

    seen: set[str] = set()
    imported = 0
    for el in event_locs:
        key = el.location_name.strip().lower()
        if key in existing_names or key in seen:
            continue
        seen.add(key)
        db.add(CatalogLocation(
            name=el.location_name.strip(),
            location_type=el.location_type,
            address=el.address,
            google_maps_link=el.google_maps_link,
            contact_person=el.contact_person,
            contact_phone=el.contact_phone,
            notes=el.notes,
        ))
        imported += 1

    db.commit()
    return {"imported": imported}


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
