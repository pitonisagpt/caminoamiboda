"""
Fix Customer records among the ~320 auto-imported by gcal_enrich.py
(2026-06-25) whose main_contact_name is actually a fragment of the
calendar event's description/title, not a person's name.

This supersedes a first attempt at this same problem — an earlier
version of this script tried to reverse-engineer whether
gcal_enrich.py's "Contacto:"/"Novios:" regexes matched the original
description, but that model was wrong (the business used more than one
description template over the years — some events used a numbered
emoji format instead — and there was already a smarter, more direct
prior fix in the repo: scripts/recover_contact_names.py, from an
earlier session). Caught in dry-run before anything was written; see
the corrected approach below, which reuses that script's own
_looks_garbage()/_extract_name_from_summary()/_is_possible_vendor()
verbatim instead of a second, less reliable heuristic.

Improvement over recover_contact_names.py: that script re-extracted
from the *live* Google Calendar event's summary — for the July 19
incident's historical (gcal_imported=true) casualties, that summary
may itself have been overwritten with the app's generic text. This
version extracts from docs/archivo/Takeout/Calendar/*.ics instead —
the pristine, pre-incident original — which is available precisely
because gcal_backup_originals_to_notes.py already resolved the id/
description matching for this same set of reservations.

Usage (against production; needs PROD_ADMIN_EMAIL/PROD_ADMIN_PASSWORD
in the environment, never hardcoded or printed):
    python scripts/gcal_fix_garbage_customer_names.py            # dry-run, prints only
    python scripts/gcal_fix_garbage_customer_names.py --confirm  # writes for real
"""
import os
import re
import sys
import time
from pathlib import Path
from typing import Optional

import requests

API_BASE = "https://api.caminoamiboda.com"
PLACEHOLDER = "Sin nombre (importado de GCal)"
GCAL_ID_RE = re.compile(r"\[gcal:([^\]]+)\]")
NOTES_HEADER_RE = re.compile(r"\[gcal:[^\]]+\]\n\[calendar:[^\]]+\]\n\n(.*)", re.DOTALL)
TAKEOUT_DIR = Path(__file__).parent.parent.parent / "docs" / "archivo" / "Takeout" / "Calendar"
ICS_FILES = ["Pendiente.ics", "Abono.ics", "OK.ics", "Obsequio.ics", "Publicidad.ics"]

CONFIRM = "--confirm" in sys.argv

# ── Copied verbatim from scripts/recover_contact_names.py ──────────────

_VENDOR_KEYWORDS = [
    "creativa", "eventos", "planner", "wedding", "producciones", "estudio",
    "asistente", "equipo", "showroom", "bodas",
]


def _looks_garbage(s: Optional[str]) -> bool:
    if not s:
        return False
    low = s.lower()
    return ("estar" in low) or (" en " in low) or ("." in s) or (len(s) > 40)


def _extract_name_from_summary(summary: str) -> str:
    name = re.sub(r"^\s*[\wÀ-ÿ]+\s*:\s*(Boda\s+)?", "", summary, flags=re.IGNORECASE)
    name = re.sub(r"^\s*(?:(?:Boda|ok)\s+)+", "", name, flags=re.IGNORECASE)
    leading_paren = re.match(r"^\s*\(([^()]*)\)\s*(.*)$", name)
    if leading_paren:
        note, rest = leading_paren.groups()
        rest = re.sub(r"^\s*(?:(?:Boda|ok)\s+)+", "", rest, flags=re.IGNORECASE).strip()
        name = f"{rest} ({note.strip()})" if rest else f"({note.strip()})"
    months = "enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre"
    name = re.sub(
        rf"\s*,?\s*\d{{1,2}}\s+(?:de\s+)?(?:{months})\s*,?\s*\d{{4}}\s*$",
        "", name, flags=re.IGNORECASE,
    )
    name = re.sub(rf"\s+(?:{months})\s*$", "", name, flags=re.IGNORECASE)
    name = re.sub(r"\s*\([^()]*\)\s*$", "", name)
    return name.strip(" -")


def _split_couple(name: str) -> tuple:
    for sep in (" y ", " & "):
        if sep in name:
            a, b = name.split(sep, 1)
            return a.strip(), b.strip()
    return None, None


def _is_possible_vendor(name: str) -> bool:
    low = name.lower()
    return any(k in low for k in _VENDOR_KEYWORDS)


# ── Takeout lookup (same two-tier matching as gcal_backup_originals_to_notes.py) ──

def load_takeout_summaries() -> tuple:
    from icalendar import Calendar

    by_id: dict = {}
    by_description: dict = {}
    for filename in ICS_FILES:
        path = TAKEOUT_DIR / filename
        if not path.exists():
            continue
        with open(path, "rb") as f:
            cal = Calendar.from_ical(f.read())
        for component in cal.walk("VEVENT"):
            uid = str(component.get("UID", "")).split("@")[0]
            summary = str(component.get("SUMMARY", "")).strip()
            description = str(component.get("DESCRIPTION", "")).strip()
            if uid:
                by_id[uid] = summary
            if description:
                by_description[" ".join(description.split())] = summary
    return by_id, by_description


def main():
    email = os.environ.get("PROD_ADMIN_EMAIL")
    password = os.environ.get("PROD_ADMIN_PASSWORD")
    if not email or not password:
        print("ERROR: set PROD_ADMIN_EMAIL and PROD_ADMIN_PASSWORD in the environment.")
        sys.exit(1)

    print("Parsing Takeout .ics files for original titles...")
    by_id, by_description = load_takeout_summaries()
    print(f"{len(by_id)} original title(s) loaded.\n")

    session = requests.Session()
    resp = session.post(f"{API_BASE}/api/auth/login", json={"email": email, "password": password})
    resp.raise_for_status()
    print("Logged in.\n")

    customers = session.get(f"{API_BASE}/api/customers").json()
    imported = [c for c in customers if c.get("referral_source") == "Google Calendar (importado)"]
    garbage = [c for c in imported if _looks_garbage(c["main_contact_name"])]
    print(f"{len(imported)} auto-imported customer(s), {len(garbage)} currently look like garbage (_looks_garbage).\n")

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
    by_customer_id = {r["customer_id"]: r for r in items if r.get("customer_id")}

    recovered, vendor_flagged, unresolved, fixed, failed = [], [], [], 0, []

    for cust in garbage:
        r = by_customer_id.get(cust["id"])
        if not r:
            unresolved.append((cust["id"], cust["main_contact_name"], "no linked historical reservation found"))
            continue

        notes = session.get(f"{API_BASE}/api/reservations/{r['id']}").json().get("notes") or ""
        m = GCAL_ID_RE.search(notes)
        summary = by_id.get(m.group(1)) if m else None
        if not summary:
            hm = NOTES_HEADER_RE.match(notes)
            if hm:
                summary = by_description.get(" ".join(hm.group(1).split()))
        if not summary:
            unresolved.append((cust["id"], cust["main_contact_name"], "original title not found in Takeout"))
            continue

        real_name = _extract_name_from_summary(summary)
        # Defensive extra pass, not present in the original script: when a
        # title has BOTH a leading note (e.g. "(Aplazado COVID-19)") and a
        # trailing vehicle tag, _extract_name_from_summary's single
        # trailing-paren strip removes the note it just relocated to the
        # end, leaving the vehicle tag stuck mid-string (confirmed against
        # reservation 249: "Margarita & Luis Fernando (Azul celeste)").
        # Idempotent — a no-op on names with no trailing parenthetical.
        real_name = re.sub(r"\s*\([^()]*\)\s*$", "", real_name).strip(" -")
        if not real_name or _looks_garbage(real_name):
            unresolved.append((cust["id"], cust["main_contact_name"], f"extraction from title also failed (title: {summary!r})"))
            continue

        if _is_possible_vendor(real_name):
            vendor_flagged.append((cust["id"], cust["main_contact_name"], real_name, r["reservation_number"]))
            continue

        recovered.append((cust["id"], cust["main_contact_name"], real_name, r["reservation_number"]))

    print(f"Recovered a real name from the original Takeout title : {len(recovered)}")
    print(f"Looks like a vendor/planner name — needs manual review : {len(vendor_flagged)}")
    print(f"Unresolved (falls back to the honest placeholder)      : {len(unresolved)}")

    if vendor_flagged:
        print("\nPossible vendor/planner (left untouched, review manually):")
        for cid, old, new, rnum in vendor_flagged:
            print(f"  customer {cid} ({rnum}): {old!r} -> would be {new!r}")

    if unresolved:
        print("\nUnresolved — would set to the placeholder instead:")
        for cid, old, reason in unresolved:
            print(f"  customer {cid}: {old!r} ({reason})")

    print(f"\n{'Would apply' if not CONFIRM else 'Applying'}:")
    for cid, old, new, rnum in recovered:
        print(f"  customer {cid} ({rnum}): {old!r} -> {new!r}")
        if CONFIRM:
            try:
                session.put(f"{API_BASE}/api/customers/{cid}", json={"main_contact_name": new}).raise_for_status()
                fixed += 1
            except Exception as e:
                print(f"    FAILED — {e}")
                failed.append(cid)
            time.sleep(0.05)
    for cid, old, reason in unresolved:
        print(f"  customer {cid}: {old!r} -> {PLACEHOLDER!r}")
        if CONFIRM:
            try:
                session.put(f"{API_BASE}/api/customers/{cid}", json={"main_contact_name": PLACEHOLDER}).raise_for_status()
                fixed += 1
            except Exception as e:
                print(f"    FAILED — {e}")
                failed.append(cid)
            time.sleep(0.05)

    if CONFIRM:
        print(f"\nFixed: {fixed}/{len(recovered) + len(unresolved)}")
        if failed:
            print(f"Failed: {failed}")


if __name__ == "__main__":
    main()
