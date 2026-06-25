"""
Google Calendar sync service.
Syncs EventTimeline records to Google Calendar on create/update/delete.
Requires GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN in .env.
If those are empty the functions return None silently — the app works without GCal.

Records with gcal_imported=True are never synced back to Google Calendar.
"""
from __future__ import annotations

from datetime import date, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from app.config import settings

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
    }
    return mapping.get(category) or settings.google_calendar_id


def calendar_category_for(reservation) -> str:
    """Derive the calendar category from a reservation's status and event_category."""
    if reservation.event_category == "obsequio":
        return "obsequio"
    if reservation.event_category == "publicidad":
        return "publicidad"
    status_map = {
        "lead":             "prospectos",
        "quoted":           "prospectos",
        "reserved":         "pendiente",
        "deposit_received": "abono",
        "confirmed":        "ok",
        "completed":        "ok",
        "cancelled":        "prospectos",
    }
    return status_map.get(reservation.status, "prospectos")


def _format_date_es(d: date) -> str:
    months = [
        "", "enero", "febrero", "marzo", "abril", "mayo", "junio",
        "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
    ]
    return f"{d.day} de {months[d.month]} de {d.year}"


def _build_description(timeline, locations: list) -> str:
    lines = []
    if timeline.assigned_vehicle:
        lines.append(f"🚗 Vehículo: {timeline.assigned_vehicle}")
    if timeline.assigned_driver:
        driver_line = f"👤 Conductor: {timeline.assigned_driver}"
        if timeline.assigned_driver_phone:
            driver_line += f" · {timeline.assigned_driver_phone}"
        lines.append(driver_line)
    if timeline.main_contact_name:
        contact_line = f"💍 Contacto: {timeline.main_contact_name}"
        if timeline.main_contact_phone:
            contact_line += f" · {timeline.main_contact_phone}"
        lines.append(contact_line)
    if timeline.special_instructions:
        lines.append(f"\n📋 Instrucciones: {timeline.special_instructions}")

    if locations:
        lines.append("")
        for loc in locations:
            emoji = _LOCATION_EMOJI.get(loc.location_type, "📌")
            loc_line = f"{emoji} {loc.location_name}"
            if loc.address:
                loc_line += f" – {loc.address}"
            lines.append(loc_line)
            if loc.google_maps_link:
                lines.append(f"   {loc.google_maps_link}")

    return "\n".join(lines)


def _primary_location_address(locations: list) -> Optional[str]:
    for loc in locations:
        if loc.location_type == "ceremony" and loc.address:
            return loc.address
    for loc in locations:
        if loc.address:
            return loc.address
    return None


def _build_gcal_event(timeline, locations: list) -> dict:
    event_date = timeline.event_date
    return {
        "summary": f"🚗 {timeline.event_name}",
        "location": _primary_location_address(locations),
        "description": _build_description(timeline, locations),
        "start": {"date": str(event_date)},
        "end": {"date": str(event_date + timedelta(days=1))},
        "colorId": "4",  # Flamingo
    }


def sync_timeline(timeline, db: Session) -> Optional[str]:
    """
    Create or update the Google Calendar event for this timeline.
    Skips timelines with gcal_imported=True — never overwrite imported events.
    Saves gcal_event_id and gcal_calendar_id back to the timeline row.
    """
    if not _gcal_configured():
        return None

    if timeline.gcal_imported:
        return timeline.gcal_event_id

    from app.models.event_location import EventLocation

    locations = (
        db.query(EventLocation)
        .filter(EventLocation.timeline_id == timeline.id)
        .order_by(EventLocation.display_order)
        .all()
    )

    service = _get_service()
    body = _build_gcal_event(timeline, locations)
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
    if gcal_id and gcal_id != timeline.gcal_event_id:
        timeline.gcal_event_id = gcal_id
        db.commit()

    return gcal_id


def delete_timeline_event(gcal_event_id: str, gcal_calendar_id: Optional[str] = None) -> None:
    """Delete the Google Calendar event. Uses gcal_calendar_id if provided."""
    if not _gcal_configured():
        return

    cal_id = gcal_calendar_id or settings.google_calendar_id
    service = _get_service()
    try:
        service.events().delete(calendarId=cal_id, eventId=gcal_event_id).execute()
    except Exception:
        pass
