from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.follow_up_message import FollowUpMessage
from app.models.reservation import Reservation, ReservationStatus
from app.schemas.follow_up_message import FollowUpPanelEntry, FollowUpTemplateEntry, MarkSentRequest
from app.services.quote_followup_messages import TEMPLATES, build_message, window_label, window_status

router = APIRouter(prefix="/api/follow-up-messages", tags=["follow-up-messages"], dependencies=[Depends(get_current_user)])


def _today():
    return datetime.now(ZoneInfo("America/Bogota")).date()


def _phone_for(r: Reservation) -> str | None:
    if r.customer:
        return r.customer.whatsapp or r.customer.phone
    if r.contact:
        return r.contact.phone
    return None


def _build_panel_entry(r: Reservation, sent_by_key: dict[str, datetime]) -> FollowUpPanelEntry:
    days_to_event = (r.event_date - _today()).days
    templates = []
    current_key = None
    for t in TEMPLATES:
        sent_at = sent_by_key.get(t.key)
        templates.append(FollowUpTemplateEntry(
            key=t.key,
            label=t.label,
            window_label=window_label(t),
            window_status=window_status(t, days_to_event),
            sent_at=sent_at,
            text=build_message(t.key, r),
        ))
        if current_key is None and sent_at is None:
            current_key = t.key

    sent_dates = [t.sent_at for t in templates if t.sent_at is not None]
    last_sent_at = max(sent_dates) if sent_dates else None

    return FollowUpPanelEntry(
        reservation_id=r.id,
        reservation_number=r.reservation_number,
        display_customer=r.display_customer,
        display_vehicle=r.display_vehicle,
        event_date=r.event_date,
        days_to_event=days_to_event,
        phone=_phone_for(r),
        current_key=current_key,
        last_sent_at=last_sent_at,
        templates=templates,
    )


@router.get("/panel", response_model=list[FollowUpPanelEntry])
def get_panel(db: Session = Depends(get_db)):
    reservations = (
        db.query(Reservation)
        .filter(
            Reservation.status == ReservationStatus.quoted,
            # Past-dated quotes are dead leads, not something to keep chasing —
            # the templates ("tu evento es en pocos días", etc.) don't make
            # sense once the date has already gone by.
            Reservation.event_date >= _today(),
        )
        .order_by(Reservation.event_date)
        .all()
    )
    if not reservations:
        return []

    ids = [r.id for r in reservations]
    rows = db.query(FollowUpMessage).filter(FollowUpMessage.reservation_id.in_(ids)).all()
    sent_by_reservation: dict[int, dict[str, datetime]] = {}
    for row in rows:
        if row.sent_at is not None:
            sent_by_reservation.setdefault(row.reservation_id, {})[row.template_key] = row.sent_at

    return [_build_panel_entry(r, sent_by_reservation.get(r.id, {})) for r in reservations]


@router.post("/{reservation_id}/mark-sent", response_model=FollowUpPanelEntry)
def mark_sent(reservation_id: int, body: MarkSentRequest, db: Session = Depends(get_db)):
    reservation = db.query(Reservation).filter(Reservation.id == reservation_id).first()
    if not reservation:
        raise HTTPException(404, "Reserva no encontrada")

    row = (
        db.query(FollowUpMessage)
        .filter(FollowUpMessage.reservation_id == reservation_id, FollowUpMessage.template_key == body.template_key)
        .first()
    )
    if not row:
        row = FollowUpMessage(reservation_id=reservation_id, template_key=body.template_key)
        db.add(row)
    row.sent_at = datetime.now(ZoneInfo("America/Bogota"))
    db.commit()

    sent_by_key = {
        r.template_key: r.sent_at
        for r in db.query(FollowUpMessage).filter(FollowUpMessage.reservation_id == reservation_id).all()
        if r.sent_at is not None
    }
    return _build_panel_entry(reservation, sent_by_key)


@router.post("/{reservation_id}/unmark-sent", response_model=FollowUpPanelEntry)
def unmark_sent(reservation_id: int, body: MarkSentRequest, db: Session = Depends(get_db)):
    reservation = db.query(Reservation).filter(Reservation.id == reservation_id).first()
    if not reservation:
        raise HTTPException(404, "Reserva no encontrada")

    row = (
        db.query(FollowUpMessage)
        .filter(FollowUpMessage.reservation_id == reservation_id, FollowUpMessage.template_key == body.template_key)
        .first()
    )
    if row:
        row.sent_at = None
        db.commit()

    sent_by_key = {
        r.template_key: r.sent_at
        for r in db.query(FollowUpMessage).filter(FollowUpMessage.reservation_id == reservation_id).all()
        if r.sent_at is not None
    }
    return _build_panel_entry(reservation, sent_by_key)
