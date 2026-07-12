from datetime import date, datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.contact import Contact, ContactStatus, ContactType
from app.models.reservation import Reservation, ReservationStatus
from app.schemas.contact import ContactCreate, ContactRead, ContactUpdate

router = APIRouter(
    prefix="/api/contacts",
    tags=["contacts"],
    redirect_slashes=False,
    dependencies=[Depends(get_current_user)],
)


def _get(contact_id: int, db: Session) -> Contact:
    c = db.query(Contact).filter(Contact.id == contact_id).first()
    if not c:
        raise HTTPException(404, "Contacto no encontrado")
    return c


@router.get("", response_model=List[ContactRead])
def list_contacts(
    search: Optional[str] = Query(None),
    contact_type: Optional[ContactType] = Query(None),
    status: Optional[ContactStatus] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(Contact).order_by(Contact.full_name)
    if contact_type:
        q = q.filter(Contact.contact_type == contact_type)
    if status:
        q = q.filter(Contact.status == status)
    if search:
        like = f"%{search}%"
        q = q.filter(
            Contact.full_name.ilike(like) |
            Contact.location.ilike(like) |
            Contact.email.ilike(like) |
            Contact.instagram.ilike(like)
        )
    return q.all()


@router.post("", response_model=ContactRead, status_code=201)
def create_contact(body: ContactCreate, db: Session = Depends(get_db)):
    contact = Contact(**body.model_dump())
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


@router.get("/{contact_id}", response_model=ContactRead)
def get_contact(contact_id: int, db: Session = Depends(get_db)):
    return _get(contact_id, db)


@router.put("/{contact_id}", response_model=ContactRead)
def update_contact(contact_id: int, body: ContactUpdate, db: Session = Depends(get_db)):
    contact = _get(contact_id, db)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(contact, field, value)
    db.commit()
    db.refresh(contact)
    return contact


@router.delete("/{contact_id}", status_code=204)
def delete_contact(contact_id: int, db: Session = Depends(get_db)):
    contact = _get(contact_id, db)
    db.delete(contact)
    db.commit()


@router.patch("/{contact_id}/last-contacted", response_model=ContactRead)
def mark_last_contacted(contact_id: int, db: Session = Depends(get_db)):
    contact = _get(contact_id, db)
    contact.last_contacted_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(contact)
    return contact


@router.get("/{contact_id}/stats")
def contact_stats(
    contact_id: int,
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: Session = Depends(get_db),
):
    _get(contact_id, db)  # 404 if missing

    today = date.today()

    def _df(filters=None):
        f = [Reservation.contact_id == contact_id] + (filters or [])
        if date_from:
            f.append(Reservation.event_date >= date_from)
        if date_to:
            f.append(Reservation.event_date <= date_to)
        return f

    ACTIVE_STATUSES = {
        ReservationStatus.lead, ReservationStatus.quoted, ReservationStatus.deposit_received,
        ReservationStatus.reserved, ReservationStatus.confirmed,
    }

    all_res = db.query(Reservation).filter(*_df()).all()
    completed = [r for r in all_res if r.status == ReservationStatus.completed]
    upcoming = [r for r in all_res if r.event_date > today and r.status not in (ReservationStatus.cancelled, ReservationStatus.completed)]

    total_rev = float(sum(r.total_amount for r in completed) or 0)
    comp_count = len(completed)

    # Money already collected regardless of whether the event has happened yet,
    # and what's still owed on active (non-completed, non-cancelled) reservations.
    deposits_received = float(sum(r.deposit_paid for r in all_res if r.status != ReservationStatus.cancelled) or 0)
    outstanding_balance = float(sum(r.remaining_balance for r in all_res if r.status in ACTIVE_STATUSES) or 0)

    all_dates = [r.event_date for r in all_res]
    summary = {
        "total_events": len(all_res),
        "completed_events": comp_count,
        "upcoming_count": len(upcoming),
        "total_revenue": total_rev,
        "avg_revenue_per_event": round(total_rev / comp_count) if comp_count else 0,
        "deposits_received": deposits_received,
        "outstanding_balance": outstanding_balance,
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

    # Seasonality (completed)
    MONTH_LABELS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]
    season_map: dict = {m: 0 for m in range(1, 13)}
    for r in completed:
        season_map[r.event_date.month] += 1
    seasonality = [{"month": m, "label": MONTH_LABELS[m-1], "count": season_map[m]} for m in range(1, 13)]

    def _serialize(rows):
        return [
            {
                "id": r.id,
                "reservation_number": r.reservation_number,
                "title": r.display_customer,
                "date": r.event_date.isoformat(),
                "status": r.status if isinstance(r.status, str) else r.status.value,
                "total_amount": float(r.total_amount),
            }
            for r in rows
        ]

    # Recent events (last 10 past events, most recent first)
    recent_events = _serialize(sorted(
        [r for r in all_res if r.event_date <= today],
        key=lambda r: r.event_date,
        reverse=True,
    )[:10])

    # Upcoming events (next 10, soonest first) — same `upcoming` list used in summary.upcoming_count
    upcoming_events = _serialize(sorted(upcoming, key=lambda r: r.event_date)[:10])

    return {
        "summary": summary,
        "monthly_trend": monthly_trend,
        "status_breakdown": status_breakdown,
        "seasonality": seasonality,
        "recent_events": recent_events,
        "upcoming_events": upcoming_events,
    }
