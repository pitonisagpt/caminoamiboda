import io
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from fastapi.responses import StreamingResponse
from jinja2 import Environment, FileSystemLoader
from sqlalchemy.orm import Session

from app.config import settings
from app.core.dependencies import get_current_user
from app.database import SessionLocal, get_db
from app.models.event_timeline import EventTimeline
from app.models.event_location import EventLocation
from app.routers.catalog_locations import sync_to_catalog
from app.models.timeline_activity import TimelineActivity
from app.models.timeline_contact import TimelineContact
from app.schemas.event_timeline import (
    ActivityCreate, ActivityRead, ActivityReorderItem, ActivityUpdate,
    ClientInviteResult, TeamInviteResult,
    LocationCreate, LocationRead, LocationUpdate,
    TimelineContactCreate, TimelineContactRead, TimelineContactUpdate,
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
    contacts = db.query(TimelineContact).filter(TimelineContact.timeline_id == timeline_id).order_by(TimelineContact.display_order).all()
    return locations, activities, contacts


def _get_contact(timeline_id: int, contact_id: int, db: Session) -> TimelineContact:
    contact = db.query(TimelineContact).filter(
        TimelineContact.id == contact_id, TimelineContact.timeline_id == timeline_id
    ).first()
    if not contact:
        raise HTTPException(404, "Contacto no encontrado")
    return contact


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
    gcal_synced = _gcal_sync(tl, db, "on create")
    db.refresh(tl)
    locs, acts, contacts = _load_locs_acts(tl.id, db)
    return TimelineRead.build(tl, locs, acts, contacts, gcal_synced=gcal_synced)


@router.get("/api/timelines/{timeline_id}", response_model=TimelineRead, dependencies=[Depends(get_current_user)])
def get_timeline(timeline_id: int, db: Session = Depends(get_db)):
    tl = _get_timeline(timeline_id, db)
    locs, acts, contacts = _load_locs_acts(timeline_id, db)
    return TimelineRead.build(tl, locs, acts, contacts)


@router.put("/api/timelines/{timeline_id}", response_model=TimelineRead, dependencies=[Depends(get_current_user)])
def update_timeline(timeline_id: int, body: TimelineUpdate, db: Session = Depends(get_db)):
    timeline = _get_timeline(timeline_id, db)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(timeline, field, value)
    db.commit()
    gcal_synced = _gcal_sync(timeline, db, "on update")
    db.refresh(timeline)
    locs, acts, contacts = _load_locs_acts(timeline_id, db)
    return TimelineRead.build(timeline, locs, acts, contacts, gcal_synced=gcal_synced)


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
    locs, acts, contacts = _load_locs_acts(timeline_id, db)
    return TimelineRead.build(_get_timeline(timeline_id, db), locs, acts, contacts)


@router.post("/api/timelines/{timeline_id}/invite-clients", response_model=ClientInviteResult, dependencies=[Depends(get_current_user)])
def invite_clients(timeline_id: int, db: Session = Depends(get_db)):
    timeline = _get_timeline(timeline_id, db)
    from app.services.google_calendar_service import invite_clients as _invite_clients
    result = _invite_clients(timeline, db)
    return ClientInviteResult(**result)


@router.delete("/api/timelines/{timeline_id}/invite-clients", status_code=204, dependencies=[Depends(get_current_user)])
def delete_client_invite(timeline_id: int, db: Session = Depends(get_db)):
    timeline = _get_timeline(timeline_id, db)
    from app.services.google_calendar_service import delete_client_invite as _delete_client_invite
    _delete_client_invite(timeline, db)


@router.post("/api/timelines/{timeline_id}/invite-team", response_model=TeamInviteResult, dependencies=[Depends(get_current_user)])
def invite_team(timeline_id: int, db: Session = Depends(get_db)):
    timeline = _get_timeline(timeline_id, db)
    from app.services.google_calendar_service import invite_team as _invite_team
    result = _invite_team(timeline, db)
    return TeamInviteResult(**result)


@router.delete("/api/timelines/{timeline_id}/invite-team", status_code=204, dependencies=[Depends(get_current_user)])
def delete_team_invite(timeline_id: int, db: Session = Depends(get_db)):
    timeline = _get_timeline(timeline_id, db)
    from app.services.google_calendar_service import delete_team_invite as _delete_team_invite
    _delete_team_invite(timeline, db)


def _gcal_sync(timeline, db: Session, label: str = "") -> Optional[bool]:
    """True = synced successfully, False = a sync was attempted and failed,
    None = nothing needed syncing (GCal not configured, or an imported
    timeline that's intentionally never overwritten — sync_timeline() would
    just hand back the existing event id without pushing this change, which
    isn't a real success worth announcing)."""
    if timeline.gcal_imported:
        return None
    try:
        from app.services.google_calendar_service import sync_timeline
        return True if sync_timeline(timeline, db) else None
    except Exception as e:
        print(f"[GCal] sync failed{' ' + label if label else ''}: {e}")
        return False


def _background_location_sync(location_id: int, label: str = "") -> None:
    """Runs after the response is sent (FastAPI BackgroundTasks) — GCal sync
    and geocoding are both slow (network calls, no bounded timeout on the
    GCal side, up to ~45s worst case on geocoding), so they're deferred here
    instead of blocking the location create/update request. Opens its own
    session: the request's `db` is already closed by the time this runs (see
    app/services/email_service.py:send_new_lead_email for the same pattern).
    Never raises — a failure here must never surface anywhere, it's a
    best-effort sync of data already saved successfully."""
    db = SessionLocal()
    try:
        loc = db.query(EventLocation).filter(EventLocation.id == location_id).first()
        if not loc:
            return
        timeline = db.query(EventTimeline).filter(EventTimeline.id == loc.timeline_id).first()
        if timeline:
            _gcal_sync(timeline, db, label)
        try:
            catalog_loc = sync_to_catalog(db, loc)
            loc.lat, loc.lng = catalog_loc.lat, catalog_loc.lng
            db.commit()
        except Exception:
            pass
    except Exception as e:
        print(f"[LocationSync] background sync failed{' ' + label if label else ''}: {e}")
    finally:
        db.close()


# ── Locations ──────────────────────────────────────────────────────────────────

@router.get("/api/timelines/{timeline_id}/locations", response_model=List[LocationRead], dependencies=[Depends(get_current_user)])
def list_locations(timeline_id: int, db: Session = Depends(get_db)):
    _get_timeline(timeline_id, db)
    return db.query(EventLocation).filter(EventLocation.timeline_id == timeline_id).order_by(EventLocation.display_order).all()


@router.post("/api/timelines/{timeline_id}/locations", response_model=LocationRead, status_code=201, dependencies=[Depends(get_current_user)])
def create_location(timeline_id: int, body: LocationCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    _get_timeline(timeline_id, db)
    max_order = db.query(EventLocation).filter(EventLocation.timeline_id == timeline_id).count()
    data = body.model_dump()
    data.setdefault("display_order", max_order)
    loc = EventLocation(**data, timeline_id=timeline_id)
    db.add(loc)
    db.commit()
    db.refresh(loc)
    # GCal sync + geocoding are both slow network calls — deferred so the
    # response doesn't wait on them (see _background_location_sync). Not
    # known yet, so explicitly None rather than relying on attribute fallback.
    background_tasks.add_task(_background_location_sync, loc.id, "on location create")
    loc.gcal_synced = None
    return loc


@router.put("/api/timelines/{timeline_id}/locations/{location_id}", response_model=LocationRead, dependencies=[Depends(get_current_user)])
def update_location(timeline_id: int, location_id: int, body: LocationUpdate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    _get_timeline(timeline_id, db)
    loc = _get_location(timeline_id, location_id, db)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(loc, field, value)
    db.commit()
    db.refresh(loc)
    background_tasks.add_task(_background_location_sync, loc.id, "on location update")
    loc.gcal_synced = None
    return loc


@router.delete("/api/timelines/{timeline_id}/locations/{location_id}", dependencies=[Depends(get_current_user)])
def delete_location(timeline_id: int, location_id: int, db: Session = Depends(get_db)):
    tl = _get_timeline(timeline_id, db)
    loc = _get_location(timeline_id, location_id, db)
    db.delete(loc)
    db.commit()
    gcal_synced = _gcal_sync(tl, db, "on location delete")
    return {"gcal_synced": gcal_synced}


# ── Contacts ───────────────────────────────────────────────────────────────────

@router.get("/api/timelines/{timeline_id}/contacts", response_model=List[TimelineContactRead], dependencies=[Depends(get_current_user)])
def list_contacts(timeline_id: int, db: Session = Depends(get_db)):
    _get_timeline(timeline_id, db)
    return db.query(TimelineContact).filter(TimelineContact.timeline_id == timeline_id).order_by(TimelineContact.display_order).all()


@router.post("/api/timelines/{timeline_id}/contacts", response_model=TimelineContactRead, status_code=201, dependencies=[Depends(get_current_user)])
def create_contact(timeline_id: int, body: TimelineContactCreate, db: Session = Depends(get_db)):
    tl = _get_timeline(timeline_id, db)
    max_order = db.query(TimelineContact).filter(TimelineContact.timeline_id == timeline_id).count()
    data = body.model_dump()
    data.setdefault("display_order", max_order)
    contact = TimelineContact(**data, timeline_id=timeline_id)
    db.add(contact)
    db.commit()
    db.refresh(contact)
    gcal_synced = _gcal_sync(tl, db, "on contact create")
    contact.gcal_synced = gcal_synced
    return contact


@router.put("/api/timelines/{timeline_id}/contacts/{contact_id}", response_model=TimelineContactRead, dependencies=[Depends(get_current_user)])
def update_contact(timeline_id: int, contact_id: int, body: TimelineContactUpdate, db: Session = Depends(get_db)):
    tl = _get_timeline(timeline_id, db)
    contact = _get_contact(timeline_id, contact_id, db)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(contact, field, value)
    db.commit()
    db.refresh(contact)
    gcal_synced = _gcal_sync(tl, db, "on contact update")
    contact.gcal_synced = gcal_synced
    return contact


@router.delete("/api/timelines/{timeline_id}/contacts/{contact_id}", dependencies=[Depends(get_current_user)])
def delete_contact(timeline_id: int, contact_id: int, db: Session = Depends(get_db)):
    tl = _get_timeline(timeline_id, db)
    contact = _get_contact(timeline_id, contact_id, db)
    db.delete(contact)
    db.commit()
    gcal_synced = _gcal_sync(tl, db, "on contact delete")
    return {"gcal_synced": gcal_synced}


# ── Activities ─────────────────────────────────────────────────────────────────

def _parse_time_minutes(t: str | None) -> int:
    """Parse a 'HH:MM' string into minutes since midnight. Missing/unparseable times sort last."""
    if not t:
        return 24 * 60 * 1000
    try:
        h_str, m_str = t.split(":")[:2]
        return int(h_str) * 60 + int(m_str)
    except (ValueError, IndexError):
        return 24 * 60 * 1000


def _activity_sort_key(day_number: int | None, time: str | None) -> tuple[int, int]:
    """Chronological sort key: day takes priority over time-of-day, so a
    Día 2 08:00 activity always sorts after every Día 1 activity."""
    return (day_number or 1, _parse_time_minutes(time))


@router.get("/api/timelines/{timeline_id}/activities", response_model=List[ActivityRead], dependencies=[Depends(get_current_user)])
def list_activities(timeline_id: int, db: Session = Depends(get_db)):
    _get_timeline(timeline_id, db)
    return db.query(TimelineActivity).filter(TimelineActivity.timeline_id == timeline_id).order_by(TimelineActivity.display_order).all()


@router.post("/api/timelines/{timeline_id}/activities", response_model=ActivityRead, status_code=201, dependencies=[Depends(get_current_user)])
def create_activity(timeline_id: int, body: ActivityCreate, db: Session = Depends(get_db)):
    tl = _get_timeline(timeline_id, db)
    existing = db.query(TimelineActivity).filter(
        TimelineActivity.timeline_id == timeline_id
    ).order_by(TimelineActivity.display_order).all()

    data = body.model_dump()
    new_key = _activity_sort_key(data.get("day_number"), data.get("time"))
    insert_index = next(
        (i for i, a in enumerate(existing) if _activity_sort_key(a.day_number, a.time) > new_key),
        len(existing),
    )

    for a in existing[insert_index:]:
        a.display_order += 1
    data["display_order"] = insert_index

    act = TimelineActivity(**data, timeline_id=timeline_id)
    db.add(act)
    db.commit()
    db.refresh(act)
    gcal_synced = _gcal_sync(tl, db, "on activity create")
    act.gcal_synced = gcal_synced
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
    tl = _get_timeline(timeline_id, db)
    act = _get_activity(timeline_id, activity_id, db)
    update_data = body.model_dump(exclude_unset=True)
    old_key = (act.day_number, act.time)

    for field, value in update_data.items():
        setattr(act, field, value)

    if ("time" in update_data or "day_number" in update_data) and (act.day_number, act.time) != old_key:
        others = db.query(TimelineActivity).filter(
            TimelineActivity.timeline_id == timeline_id,
            TimelineActivity.id != activity_id,
        ).order_by(TimelineActivity.display_order).all()
        new_key = _activity_sort_key(act.day_number, act.time)
        insert_index = next(
            (i for i, a in enumerate(others) if _activity_sort_key(a.day_number, a.time) > new_key),
            len(others),
        )
        for a in others[insert_index:]:
            a.display_order += 1
        act.display_order = insert_index

    db.commit()
    db.refresh(act)
    gcal_synced = _gcal_sync(tl, db, "on activity update")
    act.gcal_synced = gcal_synced
    return act


@router.delete("/api/timelines/{timeline_id}/activities/{activity_id}", dependencies=[Depends(get_current_user)])
def delete_activity(timeline_id: int, activity_id: int, db: Session = Depends(get_db)):
    tl = _get_timeline(timeline_id, db)
    act = _get_activity(timeline_id, activity_id, db)
    db.delete(act)
    db.commit()
    gcal_synced = _gcal_sync(tl, db, "on activity delete")
    return {"gcal_synced": gcal_synced}


# ── PDF ───────────────────────────────────────────────────────────────────────

@router.get("/api/timelines/{timeline_id}/pdf", dependencies=[Depends(get_current_user)])
def download_timeline_pdf(timeline_id: int, db: Session = Depends(get_db)):
    timeline = _get_timeline(timeline_id, db)
    locs, acts, contacts = _load_locs_acts(timeline_id, db)

    reservation = timeline.reservation
    customer = reservation.customer if reservation else None
    driver = reservation.driver if reservation else None
    planner = reservation.contact if reservation else None

    day_labels = {
        n: f"Día {n} — {_fmt_date_es(timeline.event_date + timedelta(days=n - 1))}"
        for n in sorted({a.day_number for a in acts})
    }

    env = Environment(loader=FileSystemLoader(str(_TEMPLATE_DIR)), autoescape=True)
    template = env.get_template("timeline_pdf.html")
    html = template.render(
        timeline=timeline,
        locations=locs,
        activities=acts,
        contacts=contacts,
        reservation=reservation,
        customer=customer,
        driver=driver,
        planner=planner,
        formatted_date=_fmt_date_es(datetime.now().date()),
        formatted_event_date=_fmt_date_es(timeline.event_date),
        day_labels=day_labels,
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
    locs, acts, contacts = _load_locs_acts(timeline.id, db)
    return TimelinePublic.build(timeline, locs, acts, contacts)
