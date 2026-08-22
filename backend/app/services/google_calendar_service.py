"""
Google Calendar sync service.
Syncs EventTimeline records to Google Calendar on create/update/delete.
Requires GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN in .env.
If those are empty the functions return None silently — the app works without GCal.

Records with gcal_imported=True are never synced back to Google Calendar.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Optional
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from app.config import settings
from app.services.event_span import max_day_number

SCOPES = ["https://www.googleapis.com/auth/calendar"]

_LOCATION_EMOJI = {
    "pickup": "📍",
    "ceremony": "⛪",
    "reception": "🥂",
    "photoshoot": "📸",
    "other": "📌",
}


def _gcal_configured() -> bool:
    return bool(
        settings.google_client_id
        and settings.google_client_secret
        and settings.google_refresh_token
    )


def _sync_enabled() -> bool:
    """Separate from _gcal_configured(): credentials can be valid (and the
    admin status check should keep reflecting that) while sync writes are
    still turned off locally via GOOGLE_CALENDAR_SYNC_ENABLED — local dev
    and production share the same real calendars, so this is how local
    testing avoids writing events into calendars real people see."""
    return settings.google_calendar_sync_enabled


def _get_service():
    """Build an authorized Google Calendar API service object."""
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build

    creds = Credentials(
        token=None,
        refresh_token=settings.google_refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=settings.google_client_id,
        client_secret=settings.google_client_secret,
        scopes=SCOPES,
    )
    return build("calendar", "v3", credentials=creds, cache_discovery=False)


def _get_calendar_id(category: str) -> str:
    """Return the Google Calendar ID for the given category. Falls back to primary."""
    mapping = {
        "prospectos": settings.google_calendar_prospectos,
        "pendiente":  settings.google_calendar_pendiente,
        "abono":      settings.google_calendar_abono,
        "ok":         settings.google_calendar_ok,
        "obsequio":   settings.google_calendar_obsequio,
        "publicidad": settings.google_calendar_publicidad,
        "cancelados": settings.google_calendar_cancelados,
        "prereserva": settings.google_calendar_prereserva,
    }
    return mapping.get(category) or settings.google_calendar_id


def calendar_category_for(reservation) -> str:
    """Derive the calendar category from a reservation's status and payment state."""
    if reservation.event_category == "obsequio":
        return "obsequio"
    if reservation.event_category == "publicidad" and not reservation.total_amount:
        return "publicidad"

    status = reservation.status

    if status == "cancelled":
        return "cancelados"
    if status in ("lead", "quoted"):
        return "prospectos"
    if status == "pre_reserved":
        return "prereserva"

    # reserved, deposit_received, confirmed, completed → depends on how much was paid
    total = float(reservation.total_amount or 0)
    paid = float(reservation.deposit_paid or 0)
    # remaining_balance (not a raw paid >= total check) so a retención en la
    # fuente that covers the rest of the total also counts as fully paid —
    # it discharges the client's obligation even though it's not cash.
    fully_paid = total > 0 and reservation.remaining_balance <= 0

    if status == "reserved":
        if paid <= 0:
            return "pendiente"
        return "ok" if fully_paid else "abono"
    if status == "deposit_received":
        return "abono"
    if status in ("confirmed", "completed"):
        return "ok" if fully_paid else "abono"

    return "prospectos"


def _format_date_es(d: date) -> str:
    months = [
        "", "enero", "febrero", "marzo", "abril", "mayo", "junio",
        "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
    ]
    return f"{d.day} de {months[d.month]} de {d.year}"


def _updated_at_str() -> str:
    now = datetime.now(timezone.utc).astimezone(ZoneInfo("America/Bogota"))
    return f"{_format_date_es(now.date())} · {_fmt_time(now.strftime('%H:%M'))}"


def _fmt_time(t: str) -> str:
    try:
        h, m = int(t[:2]), int(t[3:5])
        period = "p.m." if h >= 12 else "a.m."
        h12 = h % 12 or 12
        return f"{h12:02d}:{m:02d} {period}"
    except Exception:
        return t


def _fmt_cop(amount) -> str:
    try:
        return f"COP ${int(amount):,}".replace(",", ".")
    except Exception:
        return str(amount)


def _build_description(
    timeline,
    locations: list,
    activities: list | None = None,
    reservation=None,
    client_payments: list | None = None,
    settlement=None,
) -> str:
    lines = []
    if timeline.assigned_vehicle:
        lines.append(f"Vehículo: {timeline.assigned_vehicle}")
    if timeline.assigned_driver:
        driver_line = f"Conductor: {timeline.assigned_driver}"
        if timeline.assigned_driver_phone:
            driver_line += f" · {timeline.assigned_driver_phone}"
        lines.append(driver_line)
    if timeline.main_contact_name:
        contact_line = f"Contacto: {timeline.main_contact_name}"
        if timeline.main_contact_phone:
            contact_line += f" · {timeline.main_contact_phone}"
        lines.append(contact_line)
    if reservation:
        contact = getattr(reservation, "contact", None)
        if contact:
            planner_line = f"Planeador: {contact.full_name}"
            if contact.phone:
                planner_line += f" · {contact.phone}"
            lines.append(planner_line)
    if timeline.special_instructions:
        lines.append(f"\nInstrucciones: {timeline.special_instructions}")

    if locations:
        lines.append("")
        lines.append("— Ubicaciones —")
        for loc in locations:
            emoji = _LOCATION_EMOJI.get(loc.location_type, "📌")
            loc_line = f"{emoji} {loc.location_name}"
            if loc.address:
                loc_line += f" – {loc.address}"
            lines.append(loc_line)
            if loc.google_maps_link:
                lines.append(f"   {loc.google_maps_link}")

    if activities:
        sorted_acts = sorted(activities, key=lambda a: a.display_order)
        lines.append("")
        lines.append("— Itinerario —")
        for act in sorted_acts:
            lines.append(f"{_fmt_time(act.time)} – {act.description}")

    if reservation:
        total = reservation.total_amount
        paid = reservation.deposit_paid
        # Not total - paid: that ignores retención en la fuente, which also
        # discharges the client's obligation without being cash received —
        # remaining_balance already accounts for it (see Reservation model).
        remaining = reservation.remaining_balance
        lines.append("")
        lines.append("— Financiero —")
        lines.append(f"Total: {_fmt_cop(total)}")
        lines.append(f"Pagado por cliente: {_fmt_cop(paid)}")
        if client_payments:
            for p in client_payments:
                note = f" ({p.notes})" if p.notes else ""
                lines.append(f"  · {p.paid_at.strftime('%d/%m/%Y')} – {_fmt_cop(p.amount)}{note}")
        lines.append(f"Saldo cliente: {_fmt_cop(remaining)}")

    if settlement:
        lines.append("")
        lines.append("— Liquidación propietario —")
        lines.append(f"Propietario ({settlement.owner_percentage}%): {_fmt_cop(settlement.owner_amount)}")
        lines.append(f"Empresa ({100 - settlement.owner_percentage}%): {_fmt_cop(settlement.company_amount)}")
        paid_owner = settlement.amount_paid
        remaining_owner = settlement.remaining_to_owner
        lines.append(f"Abonado al propietario: {_fmt_cop(paid_owner)}")
        if remaining_owner > 0:
            lines.append(f"Pendiente al propietario: {_fmt_cop(remaining_owner)}")
        else:
            lines.append("Propietario: PAGADO COMPLETO")
        if settlement.payments:
            for p in sorted(settlement.payments, key=lambda x: x.paid_at):
                note = f" ({p.notes})" if p.notes else ""
                lines.append(f"  · {p.paid_at.strftime('%d/%m/%Y')} – {_fmt_cop(p.amount)}{note}")

    lines.append("")
    if reservation:
        lines.append(f"Ver reserva: {settings.frontend_url.rstrip('/')}/reservas/{reservation.id}")
    lines.append(f"Última actualización: {_updated_at_str()}")

    return "\n".join(lines)


def _primary_location_address(locations: list) -> Optional[str]:
    for loc in locations:
        if loc.location_type == "ceremony" and loc.address:
            return loc.address
    for loc in locations:
        if loc.address:
            return loc.address
    return None


_CATEGORY_LABEL = {
    "prospectos": "Prospecto",
    "pendiente":  "Pendiente",
    "abono":      "Abono",
    "ok":         "OK",
    "obsequio":   "Obsequio",
    "publicidad": "Publicidad",
    "prereserva": "Pre-reserva",
}

# Google Calendar's event colorId palette (1-11) is smaller and separate from the
# calendar-level color palette (1-24) — these were chosen to match each category's
# calendar color as closely as possible: Peacock/cyan, Tomato/red, Banana/yellow,
# Basil/green, Grape/purple, Blueberry/blue.
_CATEGORY_EVENT_COLOR = {
    "prospectos": "7",   # Peacock (cyan)
    "pendiente":  "11",  # Tomato (red)
    "abono":      "5",   # Banana (yellow)
    "ok":         "10",  # Basil (green)
    "obsequio":   "3",   # Grape (purple)
    "publicidad": "9",   # Blueberry (blue)
    "prereserva": "1",   # Lavender
}

_EVENT_TYPE_LABEL = {
    "wedding":               "Boda",
    "quinceanera":           "Quinceañera",
    "brand_activation":      "Activación",
    "audiovisual_production":"Producción",
    "other":                 "Evento",
}


def _short_name(event_name: str) -> str:
    """Extract first name(s) before '&' or the whole name if no couple."""
    if "&" in event_name:
        bride_part = event_name.split("&")[0].strip()
        return bride_part.split()[0] if bride_part else event_name
    return event_name.split()[0] if event_name else event_name


def _given_name(name: str | None) -> str:
    """Best-effort given name(s) from a full name string. Colombian full names
    are usually 'Nombre(s) Apellido(s)' with 2-4+ words and no reliable marker
    between the two — a 4+ word name is taken as two given names + surname(s)
    (e.g. 'Juan Sebastián Piedrahita Ruiz' → 'Juan Sebastián'), anything
    shorter as a single given name."""
    words = (name or "").strip().split()
    if not words:
        return ""
    return " ".join(words[:2]) if len(words) >= 4 else words[0]


def _couple_first_names(timeline, reservation=None, sep: str = " y ") -> str:
    """Both given names for the client-facing calendar (e.g. 'Diana Carolina y Juan Sebastián')."""
    customer = getattr(reservation, "customer", None) if reservation else None
    bride = _given_name(getattr(customer, "bride_name", None)) if customer else ""
    groom = _given_name(getattr(customer, "groom_name", None)) if customer else ""
    if not (bride and groom):
        parts = (timeline.event_name or "").split("&")
        if len(parts) > 1:
            bride = bride or _given_name(parts[0])
            groom = groom or _given_name(parts[1])
    if bride and groom:
        return f"{bride}{sep}{groom}"
    return bride or groom or _short_name(timeline.event_name or "")


def _short_vehicle(vehicle: str) -> str:
    """Return brand + color from a vehicle string like 'Mercedes Benz Gazelle Beige y negro'."""
    words = vehicle.split()
    if not words:
        return vehicle
    brand = words[0]
    color = words[-1] if len(words) > 1 else ""
    return f"{brand} {color}".strip() if color else brand


def _build_gcal_event(timeline, locations: list, activities: list | None = None, reservation=None, client_payments: list | None = None, settlement=None) -> dict:
    event_date = timeline.event_date
    category_label = _CATEGORY_LABEL.get(timeline.calendar_category or "", "")
    event_type_label = _EVENT_TYPE_LABEL.get(getattr(timeline, "event_type", "other") or "other", "Evento")
    short = _short_name(timeline.event_name or "")
    date_str = _format_date_es(event_date)
    vehicle_str = f" ({timeline.assigned_vehicle})" if timeline.assigned_vehicle else ""
    prefix = f"{category_label}: " if category_label else ""
    summary = f"{prefix}{event_type_label} {short} {date_str}{vehicle_str}"
    # Multi-day events (rare — mostly ad/production shoots) have activities with
    # day_number > 1; the all-day event must span all of them, not just day 1.
    max_day = max_day_number(activities)
    return {
        "summary": summary,
        "location": _primary_location_address(locations),
        "description": _build_description(timeline, locations, activities, reservation, client_payments, settlement),
        "start": {"date": str(event_date)},
        "end": {"date": str(event_date + timedelta(days=max_day))},
        "colorId": _CATEGORY_EVENT_COLOR.get(timeline.calendar_category or "", "8"),
    }


def _build_client_description(timeline, locations: list, activities: list | None = None, reservation=None) -> str:
    lines = []
    couple = _couple_first_names(timeline, reservation)
    lines.append(f"¡Hola {couple}! 💛 Aquí están los detalles de su gran día.")

    if timeline.assigned_vehicle:
        lines.append(f"\nVehículo: {timeline.assigned_vehicle}")

    if locations:
        lines.append("")
        lines.append("— Ubicaciones —")
        for loc in locations:
            emoji = _LOCATION_EMOJI.get(loc.location_type, "📌")
            loc_line = f"{emoji} {loc.location_name}"
            if loc.address:
                loc_line += f" – {loc.address}"
            lines.append(loc_line)
            if loc.google_maps_link:
                lines.append(f"   {loc.google_maps_link}")

    if activities:
        sorted_acts = sorted(activities, key=lambda a: a.display_order)
        lines.append("")
        lines.append("— Itinerario —")
        for act in sorted_acts:
            lines.append(f"{_fmt_time(act.time)} – {act.description}")

    lines.append("")
    lines.append(
        "Estamos muy emocionados de acompañarlos en su gran día. Les deseamos lo mejor "
        "en esta recta final de preparación, en la boda, ¡y en toda la vida que viene "
        "juntos como pareja! 💛"
    )
    lines.append("")
    lines.append("Con cariño,")
    lines.append("Camino a mi Boda")
    lines.append(f"📞 {settings.company_phone}")
    lines.append("https://www.instagram.com/caminoamiboda")

    return "\n".join(lines)


def _build_client_gcal_event(timeline, locations: list, activities: list | None = None, reservation=None, attendee_emails: list | None = None) -> dict:
    event_date = timeline.event_date
    event_type_label = _EVENT_TYPE_LABEL.get(getattr(timeline, "event_type", "other") or "other", "Evento")
    couple = _couple_first_names(timeline, reservation, sep=" & ")
    date_str = _format_date_es(event_date)
    summary = f"💍 {event_type_label} {couple} {date_str}"
    max_day = max_day_number(activities)
    return {
        "summary": summary,
        "location": _primary_location_address(locations),
        "description": _build_client_description(timeline, locations, activities, reservation),
        "start": {"date": str(event_date)},
        "end": {"date": str(event_date + timedelta(days=max_day))},
        "attendees": [{"email": e} for e in (attendee_emails or [])],
    }


def invite_clients(timeline, db: Session) -> dict:
    """
    Create/update a client-facing copy of the event in the "Clientes" calendar,
    inviting the bride, groom, and wedding planner as attendees. Never touches
    the internal operational event managed by sync_timeline().
    """
    if not _gcal_configured() or not _sync_enabled() or not settings.google_calendar_clientes:
        return {"invited": [], "error": "not_configured"}

    from app.models.event_location import EventLocation
    from app.models.timeline_activity import TimelineActivity
    from app.models.reservation import Reservation

    reservation = (
        db.query(Reservation).filter(Reservation.id == timeline.reservation_id).first()
        if timeline.reservation_id else None
    )

    customer = reservation.customer if reservation else None
    contact = reservation.contact if reservation else None
    emails = list(dict.fromkeys(
        e for e in [
            getattr(customer, "bride_email", None) if customer else None,
            getattr(customer, "groom_email", None) if customer else None,
            contact.email if contact else None,
        ] if e
    ))
    if not emails:
        return {"invited": [], "error": "no_emails"}

    locations = (
        db.query(EventLocation)
        .filter(EventLocation.timeline_id == timeline.id)
        .order_by(EventLocation.display_order)
        .all()
    )
    activities = (
        db.query(TimelineActivity)
        .filter(TimelineActivity.timeline_id == timeline.id)
        .order_by(TimelineActivity.display_order)
        .all()
    )

    service = _get_service()
    body = _build_client_gcal_event(timeline, locations, activities, reservation, emails)
    cal_id = settings.google_calendar_clientes

    if timeline.gcal_client_event_id:
        result = (
            service.events()
            .update(calendarId=cal_id, eventId=timeline.gcal_client_event_id, body=body, sendUpdates="all")
            .execute()
        )
    else:
        result = (
            service.events()
            .insert(calendarId=cal_id, body=body, sendUpdates="all")
            .execute()
        )
        timeline.gcal_client_calendar_id = cal_id

    gcal_id = result.get("id")
    html_link = result.get("htmlLink")
    if gcal_id:
        timeline.gcal_client_event_id = gcal_id
    if html_link:
        timeline.gcal_client_html_link = html_link
    timeline.gcal_client_invited_at = datetime.now(timezone.utc)
    db.commit()

    return {"invited": emails, "error": None}


def delete_client_invite(timeline, db: Session) -> None:
    """Delete the client-facing invite event (if any) and clear its tracking fields."""
    if timeline.gcal_client_event_id:
        delete_timeline_event(timeline.gcal_client_event_id, timeline.gcal_client_calendar_id)
    timeline.gcal_client_event_id = None
    timeline.gcal_client_calendar_id = None
    timeline.gcal_client_html_link = None
    timeline.gcal_client_invited_at = None
    db.commit()


def _build_team_description(timeline, locations: list, activities: list | None = None, reservation=None) -> str:
    lines = []
    if timeline.assigned_vehicle:
        lines.append(f"Vehículo: {timeline.assigned_vehicle}")
    if timeline.assigned_driver:
        driver_line = f"Conductor: {timeline.assigned_driver}"
        if timeline.assigned_driver_phone:
            driver_line += f" · {timeline.assigned_driver_phone}"
        lines.append(driver_line)
    if timeline.main_contact_name:
        contact_line = f"Contacto: {timeline.main_contact_name}"
        if timeline.main_contact_phone:
            contact_line += f" · {timeline.main_contact_phone}"
        lines.append(contact_line)
    if reservation:
        contact = getattr(reservation, "contact", None)
        if contact:
            planner_line = f"Planeador: {contact.full_name}"
            if contact.phone:
                planner_line += f" · {contact.phone}"
            lines.append(planner_line)
    if timeline.special_instructions:
        lines.append(f"\nInstrucciones: {timeline.special_instructions}")

    if locations:
        lines.append("")
        lines.append("— Ubicaciones —")
        for loc in locations:
            emoji = _LOCATION_EMOJI.get(loc.location_type, "📌")
            loc_line = f"{emoji} {loc.location_name}"
            if loc.address:
                loc_line += f" – {loc.address}"
            lines.append(loc_line)
            if loc.google_maps_link:
                lines.append(f"   {loc.google_maps_link}")
            if loc.road_access_notes:
                lines.append(f"   🚧 Acceso: {loc.road_access_notes}")

    if activities:
        sorted_acts = sorted(activities, key=lambda a: a.display_order)
        lines.append("")
        lines.append("— Itinerario —")
        for act in sorted_acts:
            lines.append(f"{_fmt_time(act.time)} – {act.description}")

    lines.append("")
    lines.append(f"Cualquier duda o cambio, contáctanos: {settings.company_phone}")
    lines.append(f"Última actualización: {_updated_at_str()}")

    return "\n".join(lines)


def _build_team_gcal_event(timeline, locations: list, activities: list | None = None, reservation=None, attendee_emails: list | None = None) -> dict:
    event_date = timeline.event_date
    event_type_label = _EVENT_TYPE_LABEL.get(getattr(timeline, "event_type", "other") or "other", "Evento")
    short = _short_name(timeline.event_name or "")
    date_str = _format_date_es(event_date)
    vehicle_str = f" ({timeline.assigned_vehicle})" if timeline.assigned_vehicle else ""
    summary = f"🚗 {event_type_label} {short} {date_str}{vehicle_str}"
    max_day = max_day_number(activities)
    return {
        "summary": summary,
        "location": _primary_location_address(locations),
        "description": _build_team_description(timeline, locations, activities, reservation),
        "start": {"date": str(event_date)},
        "end": {"date": str(event_date + timedelta(days=max_day))},
        "attendees": [{"email": e} for e in (attendee_emails or [])],
    }


def invite_team(timeline, db: Session) -> dict:
    """
    Create/update a team-facing copy of the event in the "Equipo" calendar,
    inviting the vehicle owner and whoever is actually driving (owner-driver
    takes priority over hired driver, per Reservation.display_driver). Content
    is operational only — no financial or owner-settlement figures. Never
    touches the internal operational event managed by sync_timeline() nor
    the client-facing event managed by invite_clients().
    """
    if not _gcal_configured() or not _sync_enabled() or not settings.google_calendar_team:
        return {"invited": [], "error": "not_configured"}

    from app.models.event_location import EventLocation
    from app.models.timeline_activity import TimelineActivity
    from app.models.reservation import Reservation

    reservation = (
        db.query(Reservation).filter(Reservation.id == timeline.reservation_id).first()
        if timeline.reservation_id else None
    )

    raw_emails = []
    if reservation:
        vehicle = reservation.vehicle
        if vehicle and vehicle.owner and vehicle.owner.email:
            raw_emails.append(vehicle.owner.email)
        if reservation.owner_driver_id and reservation.owner_driver:
            if reservation.owner_driver.email:
                raw_emails.append(reservation.owner_driver.email)
        elif reservation.driver_id and reservation.driver:
            if reservation.driver.email:
                raw_emails.append(reservation.driver.email)

    emails = list(dict.fromkeys(e for e in raw_emails if e))
    if not emails:
        return {"invited": [], "error": "no_emails"}

    locations = (
        db.query(EventLocation)
        .filter(EventLocation.timeline_id == timeline.id)
        .order_by(EventLocation.display_order)
        .all()
    )
    activities = (
        db.query(TimelineActivity)
        .filter(TimelineActivity.timeline_id == timeline.id)
        .order_by(TimelineActivity.display_order)
        .all()
    )

    service = _get_service()
    body = _build_team_gcal_event(timeline, locations, activities, reservation, emails)
    cal_id = settings.google_calendar_team

    if timeline.gcal_team_event_id:
        result = (
            service.events()
            .update(calendarId=cal_id, eventId=timeline.gcal_team_event_id, body=body, sendUpdates="all")
            .execute()
        )
    else:
        result = (
            service.events()
            .insert(calendarId=cal_id, body=body, sendUpdates="all")
            .execute()
        )
        timeline.gcal_team_calendar_id = cal_id

    gcal_id = result.get("id")
    html_link = result.get("htmlLink")
    if gcal_id:
        timeline.gcal_team_event_id = gcal_id
    if html_link:
        timeline.gcal_team_html_link = html_link
    timeline.gcal_team_invited_at = datetime.now(timezone.utc)
    db.commit()

    return {"invited": emails, "error": None}


def delete_team_invite(timeline, db: Session) -> None:
    """Delete the team-facing invite event (if any) and clear its tracking fields."""
    if timeline.gcal_team_event_id:
        delete_timeline_event(timeline.gcal_team_event_id, timeline.gcal_team_calendar_id)
    timeline.gcal_team_event_id = None
    timeline.gcal_team_calendar_id = None
    timeline.gcal_team_html_link = None
    timeline.gcal_team_invited_at = None
    db.commit()


def sync_timeline(timeline, db: Session) -> Optional[str]:
    """
    Create or update the Google Calendar event for this timeline.
    Skips timelines with gcal_imported=True — never overwrite imported events.
    Saves gcal_event_id and gcal_calendar_id back to the timeline row.
    """
    if not _gcal_configured() or not _sync_enabled():
        return None

    if timeline.gcal_imported:
        return timeline.gcal_event_id

    from app.models.event_location import EventLocation
    from app.models.timeline_activity import TimelineActivity
    from app.models.reservation import Reservation
    from app.models.reservation_payment import ReservationPayment
    from app.models.owner_settlement import OwnerSettlement

    locations = (
        db.query(EventLocation)
        .filter(EventLocation.timeline_id == timeline.id)
        .order_by(EventLocation.display_order)
        .all()
    )
    activities = (
        db.query(TimelineActivity)
        .filter(TimelineActivity.timeline_id == timeline.id)
        .order_by(TimelineActivity.display_order)
        .all()
    )
    reservation = (
        db.query(Reservation).filter(Reservation.id == timeline.reservation_id).first()
        if timeline.reservation_id else None
    )
    client_payments = (
        db.query(ReservationPayment)
        .filter(ReservationPayment.reservation_id == timeline.reservation_id)
        .order_by(ReservationPayment.paid_at)
        .all()
        if timeline.reservation_id else []
    )
    settlement = (
        db.query(OwnerSettlement).filter(OwnerSettlement.reservation_id == timeline.reservation_id).first()
        if timeline.reservation_id else None
    )

    service = _get_service()
    body = _build_gcal_event(timeline, locations, activities, reservation, client_payments, settlement)
    target_cal_id = _get_calendar_id(timeline.calendar_category)

    if timeline.gcal_event_id:
        current_cal_id = timeline.gcal_calendar_id or settings.google_calendar_id
        if current_cal_id != target_cal_id:
            # Move to the new calendar first
            try:
                service.events().move(
                    calendarId=current_cal_id,
                    eventId=timeline.gcal_event_id,
                    destination=target_cal_id,
                ).execute()
                timeline.gcal_calendar_id = target_cal_id
                db.commit()
            except Exception as e:
                print(f"[GCal] move failed: {e}")
        # Update content in target calendar
        result = (
            service.events()
            .update(calendarId=target_cal_id, eventId=timeline.gcal_event_id, body=body)
            .execute()
        )
    else:
        result = service.events().insert(calendarId=target_cal_id, body=body).execute()
        timeline.gcal_calendar_id = target_cal_id

    gcal_id = result.get("id")
    html_link = result.get("htmlLink")
    changed = False
    if gcal_id and gcal_id != timeline.gcal_event_id:
        timeline.gcal_event_id = gcal_id
        changed = True
    if html_link and html_link != timeline.gcal_html_link:
        timeline.gcal_html_link = html_link
        changed = True
    if changed:
        db.commit()

    return gcal_id


def delete_timeline_event(gcal_event_id: str, gcal_calendar_id: Optional[str] = None) -> None:
    """Delete the Google Calendar event. Uses gcal_calendar_id if provided."""
    if not _gcal_configured() or not _sync_enabled():
        return

    cal_id = gcal_calendar_id or settings.google_calendar_id
    service = _get_service()
    try:
        service.events().delete(calendarId=cal_id, eventId=gcal_event_id).execute()
    except Exception:
        pass
