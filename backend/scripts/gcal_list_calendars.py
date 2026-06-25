"""
List all Google Calendars in the account with their IDs.
Run from the backend directory:
  python scripts/gcal_list_calendars.py

Copy the IDs for Pendiente, Abono, OK, Obsequio, Publicidad
into backend/.env and the root .env file.
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.google_calendar_service import _get_service, _gcal_configured

if not _gcal_configured():
    print("ERROR: Google credentials not configured. Check GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN in .env")
    sys.exit(1)

service = _get_service()
result = service.calendarList().list().execute()

print("\nCalendars in your Google account:\n")
for cal in result.get("items", []):
    name = cal.get("summary", "—")
    cal_id = cal.get("id", "—")
    print(f"  {name}")
    print(f"    ID: {cal_id}")
    print()
