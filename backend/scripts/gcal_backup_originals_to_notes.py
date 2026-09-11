"""
Backup the original Google Calendar title/description of the ~380
historical events (bulk-imported by scripts/gcal_import.py) into each
reservation's own internal notes, appended after whatever is already
there.

Why: on 2026-07-19, local testing (back when GOOGLE_CALENDAR_SYNC_ENABLED
didn't exist yet — added 2026-08-08, commit 3e19f85) synced for real
against production's Google Calendar and overwrote a large number of
these historical events' title/description with the app's generic
auto-generated text. The two guards that prevent this today
(sync_timeline()'s `if timeline.gcal_imported` check, and
GOOGLE_CALENDAR_SYNC_ENABLED) both post-date the incident. The original
content is still recoverable from docs/archivo/Takeout/Calendar/*.ics —
a full Google Takeout export from 2026-06-25, hours before the first
historical timeline was even created.

This script does NOT touch Google Calendar at all — it only reads the
local .ics files and appends a backup block to each reservation's own
`notes` field via the regular API (PUT /api/reservations/{id}), which
never triggers a resync (`notes` isn't in reservations.py's
operational_fields). Whether to also restore the real Google Calendar
event is a separate, later decision.

Safe and idempotent to re-run: a reservation whose notes already carry
the "Respaldo original de Google Calendar" marker is skipped.

Usage (against production; needs PROD_ADMIN_EMAIL/PROD_ADMIN_PASSWORD
in the environment, never hardcoded or printed):
    PROD_ADMIN_EMAIL=... PROD_ADMIN_PASSWORD=... python scripts/gcal_backup_originals_to_notes.py            # dry-run, prints only
    PROD_ADMIN_EMAIL=... PROD_ADMIN_PASSWORD=... python scripts/gcal_backup_originals_to_notes.py --confirm  # writes for real
    ... --confirm --test-one=RES-202606-103   # single reservation, for a first spot check
"""
import os
import re
import sys
import time
from pathlib import Path

import requests

API_BASE = "https://api.caminoamiboda.com"
TAKEOUT_DIR = Path(__file__).parent.parent.parent / "docs" / "archivo" / "Takeout" / "Calendar"
ICS_FILES = ["Pendiente.ics", "Abono.ics", "OK.ics", "Obsequio.ics", "Publicidad.ics"]

BACKUP_MARKER = "----- Respaldo original de Google Calendar -----"
GCAL_ID_RE = re.compile(r"\[gcal:([^\]]+)\]")
# gcal_import.py's exact notes header: "[gcal:{id}]\n[calendar:{name}]\n\n{description}"
NOTES_HEADER_RE = re.compile(r"\[gcal:[^\]]+\]\n\[calendar:[^\]]+\]\n\n(.*)", re.DOTALL)

CONFIRM = "--confirm" in sys.argv
TEST_ONE = next((a.split("=", 1)[1] for a in sys.argv if a.startswith("--test-one=")), None)


def _norm(text: str) -> str:
    return " ".join(text.split())


def load_takeout() -> tuple:
    """Returns (by_id, by_description):
    - by_id: gcal event id (without the @google.com suffix, matching how
      notes stores it) -> {summary, description, calendar}. Works for
      events Google natively created with id == iCalUID minus the suffix
      (the common case).
    - by_description: normalized description text -> same dict, as a
      fallback for events where that doesn't hold (Takeout's .ics UID:
      field is RFC5545 iCalUID, which for some events — recurring-series
      instances among them — differs from the plain "id" gcal_import.py
      captured). Confirmed necessary: ~143 of 379 local historical
      reservations don't resolve by id alone, but do by description.

    Uses the icalendar library rather than hand-parsing, since .ics folds
    long lines and escapes , ; and embedded newlines — easy to get subtly
    wrong by hand."""
    from icalendar import Calendar

    by_id: dict = {}
    by_description: dict = {}
    for filename in ICS_FILES:
        path = TAKEOUT_DIR / filename
        if not path.exists():
            print(f"WARNING: {path} not found — skipping")
            continue
        calendar_name = path.stem
        with open(path, "rb") as f:
            cal = Calendar.from_ical(f.read())
        for component in cal.walk("VEVENT"):
            uid = str(component.get("UID", ""))
            uid = uid.split("@")[0]
            summary = str(component.get("SUMMARY", "")).strip()
            description = str(component.get("DESCRIPTION", "")).strip()
            entry = {"summary": summary, "description": description, "calendar": calendar_name}
            if uid:
                by_id[uid] = entry
            if description:
                by_description[_norm(description)] = entry
    return by_id, by_description


def build_backup_block(entry: dict) -> str:
    return (
        f"\n\n\n{BACKUP_MARKER}\n"
        f"Título: {entry['summary']}\n"
        f"Calendario: {entry['calendar']}\n"
        f"Descripción:\n{entry['description']}"
    )


def main():
    email = os.environ.get("PROD_ADMIN_EMAIL")
    password = os.environ.get("PROD_ADMIN_PASSWORD")
    if not email or not password:
        print("ERROR: set PROD_ADMIN_EMAIL and PROD_ADMIN_PASSWORD in the environment.")
        sys.exit(1)

    print("Parsing Takeout .ics files...")
    by_id, by_description = load_takeout()
    print(f"{len(by_id)} original event(s) loaded from Takeout.\n")

    session = requests.Session()
    resp = session.post(f"{API_BASE}/api/auth/login", json={"email": email, "password": password})
    resp.raise_for_status()
    print("Logged in.\n")

    all_statuses = "lead,quoted,pre_reserved,deposit_received,reserved,confirmed,completed,cancelled"
    items, page = [], 1
    while True:
        resp = session.get(f"{API_BASE}/api/reservations", params={
            "gcal_imported": "true", "status": all_statuses, "page_size": 200, "page": page,
        })
        resp.raise_for_status()
        data = resp.json()
        items.extend(data["items"])
        if page >= data["pages"]:
            break
        page += 1
    print(f"{len(items)} historical reservation(s) found.\n")

    if TEST_ONE:
        items = [i for i in items if i["reservation_number"] == TEST_ONE]
        if not items:
            print(f"ERROR: {TEST_ONE} not found among the historical reservations.")
            sys.exit(1)

    appended, already_done, no_match, failed = 0, 0, [], []

    for item in items:
        rid = item["id"]
        rnum = item["reservation_number"]
        detail = session.get(f"{API_BASE}/api/reservations/{rid}").json()
        notes = detail.get("notes") or ""

        if BACKUP_MARKER in notes:
            already_done += 1
            continue

        m = GCAL_ID_RE.search(notes)
        if not m:
            no_match.append((rnum, "no [gcal:...] marker in notes"))
            continue

        event_id = m.group(1)
        entry = by_id.get(event_id)
        if not entry:
            # Fallback: some events' Takeout iCalUID doesn't derive from
            # the plain id gcal_import.py stored (recurring-series
            # instances especially) — match by the description text
            # gcal_import.py already saved instead. See load_takeout().
            hm = NOTES_HEADER_RE.match(notes)
            if hm:
                entry = by_description.get(_norm(hm.group(1)))
        if not entry:
            no_match.append((rnum, f"gcal id {event_id} not found in Takeout (by id or description)"))
            continue

        block = build_backup_block(entry)
        new_notes = notes + block

        if not CONFIRM:
            print(f"[dry-run] {rnum} (id {rid}) would get:\n{block}\n{'-'*60}")
            appended += 1
            continue

        try:
            r = session.put(f"{API_BASE}/api/reservations/{rid}", json={"notes": new_notes})
            r.raise_for_status()
            print(f"{rnum} (id {rid}): backed up")
            appended += 1
        except Exception as e:
            print(f"{rnum} (id {rid}): FAILED — {e}")
            failed.append(rnum)
        time.sleep(0.05)

    print(f"\n{'[dry-run] would append' if not CONFIRM else 'Appended'}: {appended}")
    print(f"Already had a backup block: {already_done}")
    if no_match:
        print(f"\nNo match ({len(no_match)}) — needs manual review:")
        for rnum, reason in no_match:
            print(f"  {rnum}: {reason}")
    if failed:
        print(f"\nFailed to write ({len(failed)}): {failed}")


if __name__ == "__main__":
    main()
