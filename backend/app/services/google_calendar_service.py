"""
Google Calendar sync service.
Syncs EventTimeline records to Google Calendar on create/update/delete.
Requires GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN in .env.
If those are empty the functions return None silently — the app works without GCal.
"""
from __future__ import annotations

import locale
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
    """Prefer ceremony, then first location with an address."""
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
        "colorId": "4",  # Flamingo (rosado)
    }


def sync_timeline(timeline, db: Session) -> Optional[str]:
    """
    Create or update the Google Calendar event for this timeline.
    Saves gcal_event_id back to the timeline row.
    Returns the gcal_event_id, or None if GCal is not configured.
    """
    if not _gcal_configured():
        return None

    from app.models.event_location import EventLocation

    locations = (
        db.query(EventLocation)
        .filter(EventLocation.timeline_id == timeline.id)
        .order_by(EventLocation.display_order)
        .all()
    )

    service = _get_service()
    body = _build_gcal_event(timeline, locations)
    cal_id = settings.google_calendar_id

    if timeline.gcal_event_id:
        result = (
            service.events()
            .update(calendarId=cal_id, eventId=timeline.gcal_event_id, body=body)
            .execute()
        )
    else:
        result = service.events().insert(calendarId=cal_id, body=body).execute()

    gcal_id = result.get("id")
    if gcal_id and gcal_id != timeline.gcal_event_id:
        timeline.gcal_event_id = gcal_id
        db.commit()

    return gcal_id


def delete_timeline_event(gcal_event_id: str) -> None:
    """Delete the Google Calendar event. Silent if GCal not configured."""
    if not _gcal_configured():
        return

    service = _get_service()
    try:
        service.events().delete(
            calendarId=settings.google_calendar_id,
            eventId=gcal_event_id,
        ).execute()
    except Exception:
        pass
