"""Recover main_contact_name for reservations corrupted during the original
Google Calendar import (the field ended up holding a fragment of the event
description instead of the couple's name).

For each affected reservation:
  - If Customer.bride_name/groom_name are already valid, just resync
    EventTimeline.main_contact_name from them (no Customer changes).
  - Otherwise, fetch the *live* Google Calendar event and extract the real
    name from its summary/title (more reliable than the description), then
    update both Customer and EventTimeline.

Usage:
    python scripts/recover_contact_names.py [--dry-run]
"""
import re
import sys

sys.path.insert(0, "/app")

import app.models.contact          # noqa
import app.models.customer         # noqa
import app.models.driver           # noqa
import app.models.vehicle          # noqa
import app.models.vehicle_photo    # noqa
import app.models.vehicle_owner    # noqa
import app.models.quote            # noqa
import app.models.reservation      # noqa
import app.models.reservation_payment  # noqa
import app.models.event_timeline   # noqa
import app.models.event_location   # noqa
import app.models.timeline_activity  # noqa
import app.models.billing_document  # noqa
import app.models.owner_settlement  # noqa
import app.models.owner_settlement_payment  # noqa

from app.database import SessionLocal
from app.models.customer import Customer
from app.models.event_timeline import EventTimeline
from app.models.reservation import Reservation
from app.services.google_calendar_service import _get_service

DRY_RUN = "--dry-run" in sys.argv

_VENDOR_KEYWORDS = [
    "creativa", "eventos", "planner", "wedding", "producciones", "estudio",
    "asistente", "equipo", "showroom", "bodas",
]


def _looks_garbage(s: str | None) -> bool:
    if not s:
        return False
    low = s.lower()
    return ("estar" in low) or (" en " in low) or ("." in s) or (len(s) > 40)


def _extract_name_from_summary(summary: str) -> str:
    # Strip a leading "{Category}: " or "{Category}: Boda " prefix.
    name = re.sub(r"^\s*[\wÀ-ÿ]+\s*:\s*(Boda\s+)?", "", summary, flags=re.IGNORECASE)
    # A stray leading "Boda "/"ok " (possibly repeated) that survived because
    # the original summary had no colon after the category word (older/
    # inconsistent legacy format).
    name = re.sub(r"^\s*(?:(?:Boda|ok)\s+)+", "", name, flags=re.IGNORECASE)
    # If it still starts with a parenthetical note (e.g. "(Aplazado COVID-19) Boda Sara"),
    # pull the note out, strip a stray "Boda "/"ok " from what follows, and move the
    # note to the end instead — reads as "Sara (Aplazado COVID-19)".
    leading_paren = re.match(r"^\s*\(([^()]*)\)\s*(.*)$", name)
    if leading_paren:
        note, rest = leading_paren.groups()
        rest = re.sub(r"^\s*(?:(?:Boda|ok)\s+)+", "", rest, flags=re.IGNORECASE).strip()
        name = f"{rest} ({note.strip()})" if rest else f"({note.strip()})"
    # Strip a trailing date fragment some legacy titles had instead of a vehicle,
    # e.g. "Alejandro Torres Agosto 17, 2018" or "Edgar 12 junio 2021".
    months = "enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre"
    name = re.sub(
        rf"\s*,?\s*\d{{1,2}}\s+(?:de\s+)?(?:{months})\s*,?\s*\d{{4}}\s*$",
        "", name, flags=re.IGNORECASE,
    )
    name = re.sub(rf"\s+(?:{months})\s*$", "", name, flags=re.IGNORECASE)
    # Strip the trailing "(vehicle)" parenthetical (only after the date strip,
    # since some titles have "(vehicle) date" with the parens not truly last).
    name = re.sub(r"\s*\([^()]*\)\s*$", "", name)
    return name.strip(" -")


def _split_couple(name: str) -> tuple[str | None, str | None]:
    for sep in (" y ", " & "):
        if sep in name:
            a, b = name.split(sep, 1)
            return a.strip(), b.strip()
    return None, None


def _is_possible_vendor(name: str) -> bool:
    low = name.lower()
    return any(k in low for k in _VENDOR_KEYWORDS)


def main():
    db = SessionLocal()
    service = None

    rows = (
        db.query(EventTimeline, Reservation, Customer)
        .join(Reservation, Reservation.id == EventTimeline.reservation_id)
        .outerjoin(Customer, Customer.id == Reservation.customer_id)
        .filter(EventTimeline.main_contact_name.isnot(None))
        .order_by(Reservation.id)
        .all()
    )
    affected = [(t, r, c) for t, r, c in rows if _looks_garbage(t.main_contact_name)]

    print(f"Reservas afectadas: {len(affected)}")
    print("=" * 100)

    resynced_from_customer = 0
    recovered_from_gcal = 0
    vendor_flags = []
    fetch_errors = []

    for t, r, c in affected:
        old_timeline_name = t.main_contact_name

        if c and c.bride_name and c.groom_name and not _looks_garbage(c.bride_name) and not _looks_garbage(c.groom_name):
            new_name = f"{c.bride_name} & {c.groom_name}"
            print(f"[resync] reserva {r.id}: '{old_timeline_name}' -> '{new_name}' (ya estaba bien en Customer)")
            resynced_from_customer += 1
            if not DRY_RUN:
                t.main_contact_name = new_name
            continue

        if not t.gcal_event_id:
            print(f"[SIN GCAL] reserva {r.id}: '{old_timeline_name}' -> no se puede recuperar, requiere revisión manual")
            continue

        if service is None:
            service = _get_service()
        try:
            ev = service.events().get(calendarId=t.gcal_calendar_id, eventId=t.gcal_event_id).execute()
        except Exception as e:
            fetch_errors.append(f"reserva {r.id}: error consultando Google Calendar: {e}")
            continue

        summary = ev.get("summary") or ""
        real_name = _extract_name_from_summary(summary)
        if not real_name:
            print(f"[NO EXTRAÍBLE] reserva {r.id}: summary='{summary}' -> no se pudo extraer un nombre")
            continue

        flag = " *** POSIBLE WEDDING PLANNER / VENDOR, REVISAR ***" if _is_possible_vendor(real_name) else ""
        if flag:
            vendor_flags.append(f"reserva {r.id}: '{real_name}' (summary original: '{summary}')")

        print(f"[gcal] reserva {r.id}: '{old_timeline_name}' -> '{real_name}'{flag}")
        recovered_from_gcal += 1

        if not DRY_RUN and not flag:
            t.main_contact_name = real_name
            bride, groom = _split_couple(real_name)
            if c:
                if bride and groom:
                    c.bride_name = c.bride_name or bride
                    c.groom_name = c.groom_name or groom
                if _looks_garbage(c.main_contact_name):
                    c.main_contact_name = real_name

    print("=" * 100)
    print(f"Resincronizados desde Customer (ya estaba bien): {resynced_from_customer}")
    print(f"Recuperados desde el título de Google Calendar: {recovered_from_gcal}")
    print(f"Errores al consultar Google Calendar: {len(fetch_errors)}")
    if fetch_errors:
        for e in fetch_errors:
            print(" -", e)
    print(f"Posibles wedding planner/vendor (revisar manualmente): {len(vendor_flags)}")
    if vendor_flags:
        for v in vendor_flags:
            print(" -", v)

    if DRY_RUN:
        db.rollback()
        print("\n[DRY RUN] No se guardó nada. Corre sin --dry-run para aplicar.")
    else:
        db.commit()
        print("\nCambios guardados.")


if __name__ == "__main__":
    main()
