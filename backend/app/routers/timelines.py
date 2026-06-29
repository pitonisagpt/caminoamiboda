import io
import uuid
from datetime import datetime
from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from jinja2 import Environment, FileSystemLoader
from sqlalchemy.orm import Session

from app.config import settings
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

_TEMPLATE_DIR = Path(__file__).parent.parent.parent / "templates"
_MONTHS_ES = {
    1: "enero", 2: "febrero", 3: "marzo", 4: "abril",
    5: "mayo", 6: "junio", 7: "julio", 8: "agosto",
    9: "septiembre", 10: "octubre", 11: "noviembre", 12: "diciembre",
}


def _fmt_date_es(d) -> str:
    if d is None:
        return ""
    return f"{d.day} de {_MONTHS_ES[d.month]} de {d.year}"


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
    _gcal_sync(tl, db, "on create")
    db.refresh(tl)
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
    _gcal_sync(timeline, db, "on update")
    db.refresh(timeline)
    locs, acts = _load_locs_acts(timeline_id, db)
    return TimelineRead.build(timeline, locs, acts)


@router.delete("/api/timelines/{timeline_id}", status_code=204, dependencies=[Depends(get_current_user)])
def delete_timeline(timeline_id: int, db: Session = Depends(get_db)):
    timeline = _get_timeline(timeline_id, db)
    gcal_id = timeline.gcal_event_id
    gcal_cal_id = timeline.gcal_calendar_id
    gcal_imported = timeline.gcal_imported
    db.delete(timeline)
    db.commit()
    try:
        if gcal_id and not gcal_imported:
            from app.services.google_calendar_service import delete_timeline_event
            delete_timeline_event(gcal_id, gcal_cal_id)
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


def _gcal_sync(timeline, db: Session, label: str = ""):
    try:
        from app.services.google_calendar_service import sync_timeline
        sync_timeline(timeline, db)
    except Exception as e:
        print(f"[GCal] sync failed{' ' + label if label else ''}: {e}")


# ── Locations ──────────────────────────────────────────────────────────────────

@router.get("/api/timelines/{timeline_id}/locations", response_model=List[LocationRead], dependencies=[Depends(get_current_user)])
def list_locations(timeline_id: int, db: Session = Depends(get_db)):
    _get_timeline(timeline_id, db)
    return db.query(EventLocation).filter(EventLocation.timeline_id == timeline_id).order_by(EventLocation.display_order).all()


@router.post("/api/timelines/{timeline_id}/locations", response_model=LocationRead, status_code=201, dependencies=[Depends(get_current_user)])
def create_location(timeline_id: int, body: LocationCreate, db: Session = Depends(get_db)):
    tl = _get_timeline(timeline_id, db)
    max_order = db.query(EventLocation).filter(EventLocation.timeline_id == timeline_id).count()
    data = body.model_dump()
    data.setdefault("display_order", max_order)
    loc = EventLocation(**data, timeline_id=timeline_id)
    db.add(loc)
    db.commit()
    db.refresh(loc)
    _gcal_sync(tl, db, "on location create")
    return loc


@router.put("/api/timelines/{timeline_id}/locations/{location_id}", response_model=LocationRead, dependencies=[Depends(get_current_user)])
def update_location(timeline_id: int, location_id: int, body: LocationUpdate, db: Session = Depends(get_db)):
    tl = _get_timeline(timeline_id, db)
    loc = _get_location(timeline_id, location_id, db)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(loc, field, value)
    db.commit()
    db.refresh(loc)
    _gcal_sync(tl, db, "on location update")
    return loc


@router.delete("/api/timelines/{timeline_id}/locations/{location_id}", status_code=204, dependencies=[Depends(get_current_user)])
def delete_location(timeline_id: int, location_id: int, db: Session = Depends(get_db)):
    tl = _get_timeline(timeline_id, db)
    loc = _get_location(timeline_id, location_id, db)
    db.delete(loc)
    db.commit()
    _gcal_sync(tl, db, "on location delete")


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


# ── PDF ───────────────────────────────────────────────────────────────────────

@router.get("/api/timelines/{timeline_id}/pdf", dependencies=[Depends(get_current_user)])
def download_timeline_pdf(timeline_id: int, db: Session = Depends(get_db)):
    timeline = _get_timeline(timeline_id, db)
    locs, acts = _load_locs_acts(timeline_id, db)

    reservation = timeline.reservation
    customer = reservation.customer if reservation else None
    driver = reservation.driver if reservation else None
    planner = reservation.contact if reservation else None

    env = Environment(loader=FileSystemLoader(str(_TEMPLATE_DIR)), autoescape=True)
    template = env.get_template("timeline_pdf.html")
    html = template.render(
        timeline=timeline,
        locations=locs,
        activities=acts,
        reservation=reservation,
        customer=customer,
        driver=driver,
        planner=planner,
        formatted_date=_fmt_date_es(datetime.now().date()),
        formatted_event_date=_fmt_date_es(timeline.event_date),
        company_name=settings.company_name,
        company_phone=settings.company_phone,
        city=settings.city,
    )

    buf = io.BytesIO()
    try:
        from weasyprint import HTML as WeasyHTML
        pdf_bytes = WeasyHTML(string=html, base_url=str(_TEMPLATE_DIR)).write_pdf()
        buf.write(pdf_bytes)
    except Exception:
        from xhtml2pdf import pisa
        pisa.CreatePDF(io.StringIO(html), dest=buf)
    buf.seek(0)

    safe_name = "".join(c if c.isalnum() or c in " -_" else "_" for c in (timeline.event_name or "evento"))
    filename = f"Minuto-a-Minuto-{safe_name}.pdf"
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


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
