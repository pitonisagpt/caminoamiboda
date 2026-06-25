"""
Import existing Google Calendar events into the database as Reservations.

Events are never synced back to Google Calendar (gcal_imported=True).
Safe to re-run — skips events already imported (idempotent by gcal_event_id).

Usage:
  cd backend
  python scripts/gcal_import.py            # real import
  python scripts/gcal_import.py --dry-run  # preview only, no DB writes
"""
import re
import sys
import os
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.config import settings
from app.services.google_calendar_service import _get_service, _gcal_configured

# Import all models so SQLAlchemy can resolve relationships
import app.models.customer        # noqa
import app.models.vehicle_photo   # noqa
import app.models.vehicle         # noqa
import app.models.driver          # noqa
import app.models.vehicle_owner   # noqa
import app.models.quote           # noqa
import app.models.reservation     # noqa
import app.models.event_location    # noqa
import app.models.timeline_activity # noqa
import app.models.event_timeline    # noqa

DRY_RUN = "--dry-run" in sys.argv

# Calendar ID → reservation mapping
CALENDAR_MAP = {
    settings.google_calendar_pendiente:  {"status": "reserved",          "event_category": "standard"},
    settings.google_calendar_abono:      {"status": "deposit_received",   "event_category": "standard"},
    settings.google_calendar_ok:         {"status": "completed",          "event_category": "standard"},
    settings.google_calendar_obsequio:   {"status": "completed",          "event_category": "obsequio"},
    settings.google_calendar_publicidad: {"status": "completed",          "event_category": "publicidad"},
}

# Strip common calendar-name prefixes from event titles
_PREFIX_RE = re.compile(
    r"^(abono|pendiente|ok|obsequio|publicidad)[:\s]+",
    re.IGNORECASE,
)


def _clean_summary(summary: str) -> str:
    return _PREFIX_RE.sub("", summary).strip()


def _parse_date(dt_str: str):
    """Parse DTSTART value — may be a date or datetime string from the API."""
    if not dt_str:
        return None
    try:
        if "T" in dt_str:
            return datetime.fromisoformat(dt_str.replace("Z", "+00:00")).date()
        return datetime.strptime(dt_str, "%Y-%m-%d").date()
    except Exception:
        return None


def _next_number(db, now=None) -> str:
    from datetime import datetime as dt
    from app.models.reservation import Reservation
    now = now or dt.now()
    prefix = f"RES-{now.strftime('%Y%m')}-"
    last = (
        db.query(Reservation)
        .filter(Reservation.reservation_number.like(f"{prefix}%"))
        .order_by(Reservation.reservation_number.desc())
        .first()
    )
    seq = 1
    if last:
        try:
            seq = int(last.reservation_number.split("-")[-1]) + 1
        except ValueError:
            pass
    return f"{prefix}{seq:03d}"


def run():
    if not _gcal_configured():
        print("ERROR: Google credentials not configured.")
        sys.exit(1)

    missing = [name for name, cal_id in [
        ("PENDIENTE", settings.google_calendar_pendiente),
        ("ABONO",     settings.google_calendar_abono),
        ("OK",        settings.google_calendar_ok),
        ("OBSEQUIO",  settings.google_calendar_obsequio),
        ("PUBLICIDAD",settings.google_calendar_publicidad),
    ] if not cal_id]
    if missing:
        print(f"ERROR: Missing calendar IDs in .env: {', '.join(missing)}")
        sys.exit(1)

    service = _get_service()

    if not DRY_RUN:
        from app.database import SessionLocal
        from app.models.reservation import Reservation
        db = SessionLocal()
    else:
        db = None
        print("=== DRY RUN — no changes will be written ===\n")

    total_imported = 0
    total_skipped = 0

    for cal_id, mapping in CALENDAR_MAP.items():
        cal_name = [k for k, v in {
            "Pendiente":  settings.google_calendar_pendiente,
            "Abono":      settings.google_calendar_abono,
            "OK":         settings.google_calendar_ok,
            "Obsequio":   settings.google_calendar_obsequio,
            "Publicidad": settings.google_calendar_publicidad,
        }.items() if v == cal_id][0]

        print(f"\n── {cal_name} ──────────────────────────")

        page_token = None
        while True:
            resp = service.events().list(
                calendarId=cal_id,
                maxResults=250,
                pageToken=page_token,
                singleEvents=True,
                orderBy="startTime",
            ).execute()

            for event in resp.get("items", []):
                gcal_event_id = event.get("id")
                summary = event.get("summary", "Sin título")
                description = event.get("description", "") or ""
                start = event.get("start", {})
                date_str = start.get("date") or start.get("dateTime", "")
                event_date = _parse_date(date_str)

                if not event_date:
                    print(f"  [SKIP] {summary} — no date")
                    total_skipped += 1
                    continue

                clean_title = _clean_summary(summary)

                if not DRY_RUN:
                    # Check for existing import
                    existing = db.query(Reservation).filter(
                        Reservation.notes.contains(f"[gcal:{gcal_event_id}]")
                    ).first()
                    if existing:
                        print(f"  [EXISTS] {clean_title} · {event_date}")
                        total_skipped += 1
                        continue

                    from app.models.reservation import Reservation as Res
                    r = Res(
                        reservation_number=_next_number(db),
                        event_date=event_date,
                        status=mapping["status"],
                        event_category=mapping["event_category"],
                        total_amount=0,
                        deposit_paid=0,
                        gcal_imported=True,
                        notes=(
                            f"[gcal:{gcal_event_id}]\n"
                            f"[calendar:{cal_name}]\n\n"
                            + description
                        ).strip(),
                        special_instructions=None,
                    )
                    db.add(r)
                    db.commit()
                    print(f"  [OK] {clean_title} · {event_date} → {mapping['status']}")
                else:
                    print(f"  [WOULD IMPORT] {clean_title} · {event_date} → {mapping['status']} ({mapping['event_category']})")

                total_imported += 1

            page_token = resp.get("nextPageToken")
            if not page_token:
                break

    print(f"\n{'DRY RUN ' if DRY_RUN else ''}Done. Imported: {total_imported}  Skipped: {total_skipped}")
    if db:
        db.close()


if __name__ == "__main__":
    run()
