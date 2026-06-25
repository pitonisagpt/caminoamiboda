import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.event_timeline import EventTimeline
from app.models.event_location import EventLocation
from app.models.timeline_activity import TimelineActivity
from app.schemas.event_timeline import (
    ActivityCreate, ActivityRead, ActivityReorderItem, ActivityUpdate,
    LocationCreate, LocationRead, LocationUpdate,
    TimelineCreate, TimelineList, TimelinePublic, TimelineRead, TimelineUpdate,
)

router = APIRouter(tags=["timelines"], redirect_slashes=False)

# ── Helpers ────────────────────────────────────────────────────────────────────

def _get_timeline(timeline_id: int, db: Session) -> EventTimeline:
    t = db.query(EventTimeline).filter(EventTimeline.id == timeline_id).first()
    if not t:
        raise HTTPException(404, "Evento no encontrado")
    return t


def _get_location(timeline_id: int, location_id: int, db: Session) -> EventLocation:
    loc = db.query(EventLocation).filter(
        EventLocation.id == location_id, EventLocation.timeline_id == timeline_id
    ).first()
    if not loc:
        raise HTTPException(404, "Ubicación no encontrada")
    return loc


def _load_locs_acts(timeline_id: int, db: Session):
    locations = db.query(EventLocation).filter(EventLocation.timeline_id == timeline_id).order_by(EventLocation.display_order).all()
    activities = db.query(TimelineActivity).filter(TimelineActivity.timeline_id == timeline_id).order_by(TimelineActivity.display_order).all()
    return locations, activities


def _get_activity(timeline_id: int, activity_id: int, db: Session) -> TimelineActivity:
    act = db.query(TimelineActivity).filter(
        TimelineActivity.id == activity_id, TimelineActivity.timeline_id == timeline_id
    ).first()
    if not act:
        raise HTTPException(404, "Actividad no encontrada")
    return act


# ── Timelines CRUD ─────────────────────────────────────────────────────────────

@router.get("/api/timelines", response_model=List[TimelineList], dependencies=[Depends(get_current_user)])
def list_timelines(db: Session = Depends(get_db)):
    return db.query(EventTimeline).order_by(EventTimeline.event_date.desc()).all()


@router.post("/api/timelines", response_model=TimelineRead, status_code=201, dependencies=[Depends(get_current_user)])
def create_timeline(body: TimelineCreate, db: Session = Depends(get_db)):
    timeline = EventTimeline(
        **body.model_dump(),
        share_token_driver=uuid.uuid4().hex,
        share_token_customer=uuid.uuid4().hex,
        share_token_ops=uuid.uuid4().hex,
    )
    db.add(timeline)
    db.commit()
    tl = _get_timeline(timeline.id, db)
    try:
        from app.services.google_calendar_service import sync_timeline
        sync_timeline(tl, db)
    except Exception as e:
        print(f"[GCal] sync failed on create: {e}")
    locs, acts = _load_locs_acts(tl.id, db)
    return TimelineRead.build(tl, locs, acts)


@router.get("/api/timelines/{timeline_id}", response_model=TimelineRead, dependencies=[Depends(get_current_user)])
def get_timeline(timeline_id: int, db: Session = Depends(get_db)):
    tl = _get_timeline(timeline_id, db)
    locs, acts = _load_locs_acts(timeline_id, db)
    return TimelineRead.build(tl, locs, acts)


@router.put("/api/timelines/{timeline_id}", response_model=TimelineRead, dependencies=[Depends(get_current_user)])
def update_timeline(timeline_id: int, body: TimelineUpdate, db: Session = Depends(get_db)):
    timeline = _get_timeline(timeline_id, db)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(timeline, field, value)
    db.commit()
    try:
        from app.services.google_calendar_service import sync_timeline
        sync_timeline(timeline, db)
    except Exception as e:
        print(f"[GCal] sync failed on update: {e}")
    locs, acts = _load_locs_acts(timeline_id, db)
    return TimelineRead.build(timeline, locs, acts)


@router.delete("/api/timelines/{timeline_id}", status_code=204, dependencies=[Depends(get_current_user)])
def delete_timeline(timeline_id: int, db: Session = Depends(get_db)):
    timeline = _get_timeline(timeline_id, db)
    gcal_id = timeline.gcal_event_id
    db.delete(timeline)
    db.commit()
    try:
        if gcal_id:
            from app.services.google_calendar_service import delete_timeline_event
            delete_timeline_event(gcal_id)
    except Exception as e:
        print(f"[GCal] delete failed: {e}")


@router.post("/api/timelines/{timeline_id}/regenerate-tokens", response_model=TimelineRead, dependencies=[Depends(get_current_user)])
def regenerate_tokens(timeline_id: int, db: Session = Depends(get_db)):
    timeline = _get_timeline(timeline_id, db)
    timeline.share_token_driver = uuid.uuid4().hex
    timeline.share_token_customer = uuid.uuid4().hex
    timeline.share_token_ops = uuid.uuid4().hex
    db.commit()
    locs, acts = _load_locs_acts(timeline_id, db)
    return TimelineRead.build(_get_timeline(timeline_id, db), locs, acts)


# ── Locations ──────────────────────────────────────────────────────────────────

@router.get("/api/timelines/{timeline_id}/locations", response_model=List[LocationRead], dependencies=[Depends(get_current_user)])
def list_locations(timeline_id: int, db: Session = Depends(get_db)):
    _get_timeline(timeline_id, db)
    return db.query(EventLocation).filter(EventLocation.timeline_id == timeline_id).order_by(EventLocation.display_order).all()


@router.post("/api/timelines/{timeline_id}/locations", response_model=LocationRead, status_code=201, dependencies=[Depends(get_current_user)])
def create_location(timeline_id: int, body: LocationCreate, db: Session = Depends(get_db)):
    _get_timeline(timeline_id, db)
    max_order = db.query(EventLocation).filter(EventLocation.timeline_id == timeline_id).count()
    data = body.model_dump()
    data.setdefault("display_order", max_order)
    loc = EventLocation(**data, timeline_id=timeline_id)
    db.add(loc)
    db.commit()
    db.refresh(loc)
    return loc


@router.put("/api/timelines/{timeline_id}/locations/{location_id}", response_model=LocationRead, dependencies=[Depends(get_current_user)])
def update_location(timeline_id: int, location_id: int, body: LocationUpdate, db: Session = Depends(get_db)):
    loc = _get_location(timeline_id, location_id, db)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(loc, field, value)
    db.commit()
    db.refresh(loc)
    return loc


@router.delete("/api/timelines/{timeline_id}/locations/{location_id}", status_code=204, dependencies=[Depends(get_current_user)])
def delete_location(timeline_id: int, location_id: int, db: Session = Depends(get_db)):
    loc = _get_location(timeline_id, location_id, db)
    db.delete(loc)
    db.commit()


# ── Activities ─────────────────────────────────────────────────────────────────

@router.get("/api/timelines/{timeline_id}/activities", response_model=List[ActivityRead], dependencies=[Depends(get_current_user)])
def list_activities(timeline_id: int, db: Session = Depends(get_db)):
    _get_timeline(timeline_id, db)
    return db.query(TimelineActivity).filter(TimelineActivity.timeline_id == timeline_id).order_by(TimelineActivity.display_order).all()


@router.post("/api/timelines/{timeline_id}/activities", response_model=ActivityRead, status_code=201, dependencies=[Depends(get_current_user)])
def create_activity(timeline_id: int, body: ActivityCreate, db: Session = Depends(get_db)):
    _get_timeline(timeline_id, db)
    max_order = db.query(TimelineActivity).filter(TimelineActivity.timeline_id == timeline_id).count()
    data = body.model_dump()
    data.setdefault("display_order", max_order)
    act = TimelineActivity(**data, timeline_id=timeline_id)
    db.add(act)
    db.commit()
    db.refresh(act)
    return act


@router.put("/api/timelines/{timeline_id}/activities/reorder", status_code=204, dependencies=[Depends(get_current_user)])
def reorder_activities(timeline_id: int, body: List[ActivityReorderItem], db: Session = Depends(get_db)):
    _get_timeline(timeline_id, db)
    for item in body:
        db.query(TimelineActivity).filter(
            TimelineActivity.id == item.id,
            TimelineActivity.timeline_id == timeline_id,
        ).update({"display_order": item.display_order})
    db.commit()


@router.put("/api/timelines/{timeline_id}/activities/{activity_id}", response_model=ActivityRead, dependencies=[Depends(get_current_user)])
def update_activity(timeline_id: int, activity_id: int, body: ActivityUpdate, db: Session = Depends(get_db)):
    act = _get_activity(timeline_id, activity_id, db)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(act, field, value)
    db.commit()
    db.refresh(act)
    return act


@router.delete("/api/timelines/{timeline_id}/activities/{activity_id}", status_code=204, dependencies=[Depends(get_current_user)])
def delete_activity(timeline_id: int, activity_id: int, db: Session = Depends(get_db)):
    act = _get_activity(timeline_id, activity_id, db)
    db.delete(act)
    db.commit()


# ── Public token endpoints (no auth) ──────────────────────────────────────────

@router.get("/api/public/evento/{token}", response_model=TimelinePublic)
def get_public_event(token: str, db: Session = Depends(get_db)):
    timeline = db.query(EventTimeline).filter(
        (EventTimeline.share_token_driver == token) |
        (EventTimeline.share_token_customer == token) |
        (EventTimeline.share_token_ops == token)
    ).first()
    if not timeline:
        raise HTTPException(404, "Evento no encontrado o enlace inválido")
    locs, acts = _load_locs_acts(timeline.id, db)
    return TimelinePublic.build(timeline, locs, acts)
