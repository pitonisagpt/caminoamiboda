"""
Enriches already-imported GCal reservations with parsed field data.

For each imported reservation, reads the original GCal description and extracts:
  - total_amount  (Valor: $X)
  - deposit_paid  (Abono: $X / abona $X)
  - contact name + phone → creates Customer records (deduped by phone)
  - vehicle text → stored in special_instructions
  - driver name + phone → stored in EventTimeline
  - minuto-a-minuto activities → creates EventTimeline + TimelineActivity records

Run inside Docker:
  docker exec caminoamiboda-backend-1 python scripts/gcal_enrich.py
  docker exec caminoamiboda-backend-1 python scripts/gcal_enrich.py --dry-run
"""
import re
import sys
import os
from datetime import date
from decimal import Decimal
from html.parser import HTMLParser

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# Import all models so SQLAlchemy can resolve relationships
import app.models.customer          # noqa
import app.models.vehicle_photo     # noqa
import app.models.vehicle           # noqa
import app.models.driver            # noqa
import app.models.vehicle_owner     # noqa
import app.models.quote             # noqa
import app.models.reservation       # noqa
import app.models.event_location    # noqa
import app.models.timeline_activity # noqa
import app.models.event_timeline    # noqa

from app.config import settings
from app.services.google_calendar_service import _get_service, _gcal_configured

DRY_RUN = "--dry-run" in sys.argv

CALENDAR_MAP = {
    settings.google_calendar_pendiente:  {"status": "reserved",        "event_category": "standard",   "name": "Pendiente",  "category": "pendiente"},
    settings.google_calendar_abono:      {"status": "deposit_received", "event_category": "standard",   "name": "Abono",      "category": "abono"},
    settings.google_calendar_ok:         {"status": "completed",        "event_category": "standard",   "name": "OK",         "category": "ok"},
    settings.google_calendar_obsequio:   {"status": "completed",        "event_category": "obsequio",   "name": "Obsequio",   "category": "obsequio"},
    settings.google_calendar_publicidad: {"status": "completed",        "event_category": "publicidad", "name": "Publicidad", "category": "publicidad"},
}

_PREFIX_RE = re.compile(r"^(abono|pendiente|ok|obsequio|publicidad)[:\s]+", re.IGNORECASE)


# ── HTML stripping ──────────────────────────────────────────────────────────────

class _Stripper(HTMLParser):
    def __init__(self):
        super().__init__()
        self._parts: list[str] = []

    def handle_data(self, data: str) -> None:
        self._parts.append(data)

    def handle_starttag(self, tag: str, attrs) -> None:
        if tag in ("br", "p", "div", "li", "tr"):
            self._parts.append("\n")

    def text(self) -> str:
        raw = "".join(self._parts)
        return re.sub(r"\n{3,}", "\n\n", raw).strip()


def strip_html(text: str) -> str:
    if not text or "<" not in text:
        return text or ""
    p = _Stripper()
    p.feed(text)
    return p.text()


# ── Amount parsers ──────────────────────────────────────────────────────────────

def _to_decimal(raw: str) -> Decimal | None:
    """Convert Colombian amount string to Decimal. Both . and , are thousand separators."""
    cleaned = re.sub(r"[.,\s]", "", raw)
    try:
        val = int(cleaned)
        if 50_000 <= val <= 50_000_000:
            return Decimal(val)
    except ValueError:
        pass
    return None


def parse_amount(text: str, keyword: str) -> Decimal | None:
    pattern = rf"{keyword}[\s:]+\$?\s*([\d][\d.,]*\d)"
    m = re.search(pattern, text, re.IGNORECASE)
    return _to_decimal(m.group(1)) if m else None


def parse_valor(text: str) -> Decimal | None:
    return parse_amount(text, r"[Vv]alor")


def parse_deposit(text: str) -> Decimal | None:
    for kw in (r"[Aa]bono", r"[Aa]bona(?:r|n)?", r"[Aa]bon[oó]"):
        v = parse_amount(text, kw)
        if v is not None:
            return v
    return None


# ── Phone parser ────────────────────────────────────────────────────────────────

def parse_phone(text: str) -> str | None:
    """Return first Colombian mobile phone found, normalized to +57XXXXXXXXXX."""
    # +57 prefix with optional separators
    m = re.search(r"\+57[\s\-]*(3[\d\s\-]{9,13})", text)
    if m:
        digits = re.sub(r"\D", "", m.group(1))[:10]
        if len(digits) == 10:
            return f"+57{digits}"
    # Bare 10-digit mobile starting with 3
    m = re.search(r"\b(3\d{9})\b", text)
    if m:
        return f"+57{m.group(1)}"
    return None


# ── Name parsers ────────────────────────────────────────────────────────────────

def _clean_name(raw: str) -> str | None:
    """Remove markdown bold markers, trailing phone fragments, and separators from a parsed name."""
    name = raw.strip().lstrip("*").strip()
    name = re.sub(r"[\+\d][\d\s\-]+$", "", name).strip().rstrip("/: *").strip()
    # Remove trailing dates like "Julio 14" or "Enero 6, 2019"
    name = re.sub(r"\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b.*", "", name, flags=re.IGNORECASE).strip()
    return name if len(name) > 2 else None


def parse_contact_name(text: str, summary: str) -> str | None:
    # "Contacto: Name [phone]" — stop before phone or newline
    m = re.search(r"[Cc]ontacto[:\s]+([^\n+/\d][^\n+/]*?)(?=\s*[\+\d]|\s*/|\n|$)", text)
    if m:
        name = _clean_name(m.group(1))
        if name:
            return name

    # "Novia: Name" or "Novios: Name"
    m = re.search(r"[Nn]ovi[ao]s?[:\s]+([^\n+/\d][^\n+/]*?)(?=\s*[\+\d]|\n|$)", text)
    if m:
        name = _clean_name(m.group(1))
        if name:
            return name

    # Fall back to summary (stripped of prefix and vehicle)
    clean = _PREFIX_RE.sub("", summary).strip()
    clean = re.sub(r"\([^)]*\)", "", clean).strip()
    clean = re.sub(r"^[Bb]oda\s+", "", clean).strip()
    return clean if len(clean) > 2 else None


def parse_couple_names(summary: str) -> tuple[str | None, str | None]:
    """Return (person1, person2) when summary contains 'X & Y' or 'X y Y'."""
    clean = _PREFIX_RE.sub("", summary).strip()
    clean = re.sub(r"\([^)]*\)", "", clean).strip()
    clean = re.sub(r"^[Bb]oda\s+", "", clean).strip()
    m = re.search(r"(.+?)\s*(?:&| y )\s*(.+)", clean)
    if m:
        return m.group(1).strip(), m.group(2).strip()
    return None, None


# ── Vehicle / driver parsers ────────────────────────────────────────────────────

def parse_vehicle(summary: str, description: str) -> str | None:
    # Parentheses in summary: "Boda Camila (Combi Azul Celeste)"
    matches = re.findall(r"\(([^)]+)\)", summary)
    if matches:
        return matches[-1].strip()
    # "Auto: ..." in description
    m = re.search(r"[Aa]uto[:\s]+([^\n/,]+)", description)
    if m:
        return m.group(1).strip()
    return None


def parse_driver(text: str) -> tuple[str | None, str | None]:
    """Return (driver_name, driver_phone) from 'Conductor: Name +57...' pattern."""
    # Only capture up to first newline, period, or comma
    m = re.search(r"[Cc]onductor[:\s]+(.+?)(?:\n|\.|,|$)", text)
    if not m:
        return None, None
    raw = m.group(1).strip()[:120]  # hard cap to avoid runaway capture
    phone = parse_phone(raw)
    name_raw = re.sub(r"\+?\d[\d\s\-]{8,}", "", raw)
    name = _clean_name(name_raw)
    # Discard if name is suspiciously long (probably caught prose)
    if name and len(name) > 60:
        name = name[:60].strip()
    return name, phone


# ── Minuto a minuto parser ──────────────────────────────────────────────────────

def parse_minuto_block(description: str) -> str | None:
    """Return the full 'Minuto a Minuto...' block or None."""
    m = re.search(r"(\*?[Mm]inuto\s+a\s+[Mm]inuto.+)", description, re.DOTALL)
    return m.group(1).strip() if m else None


def parse_timeline_activities(minuto_text: str) -> list[dict]:
    """Parse '*HH:MM* Description' lines into activity dicts."""
    activities = []
    pattern = re.compile(r"\*?(\d{1,2}:\d{2})\*?\s+(.+)")
    for i, line in enumerate(minuto_text.split("\n")):
        line = line.strip()
        m = pattern.match(line)
        if m:
            activities.append({
                "time": m.group(1),
                "description": m.group(2).strip(),
                "display_order": i,
            })
    return activities


# ── Customer dedup ──────────────────────────────────────────────────────────────

_phone_cache: dict[str, int] = {}  # phone → customer.id


def find_or_create_customer(
    db,
    name: str | None,
    phone: str | None,
    wedding_date: date,
    bride_name: str | None = None,
    groom_name: str | None = None,
):
    from app.models.customer import Customer

    if phone:
        if phone in _phone_cache:
            return db.get(Customer, _phone_cache[phone])
        existing = db.query(Customer).filter(Customer.phone == phone).first()
        if existing:
            _phone_cache[phone] = existing.id
            return existing

    c = Customer(
        main_contact_name=name or "Sin nombre (importado de GCal)",
        phone=phone,
        bride_name=bride_name,
        groom_name=groom_name,
        wedding_date=wedding_date,
        referral_source="Google Calendar (importado)",
        notes="[Importado automáticamente de GCal]",
    )
    db.add(c)
    db.flush()
    if phone:
        _phone_cache[phone] = c.id
    return c


# ── Timeline creation ───────────────────────────────────────────────────────────

def create_or_skip_timeline(db, res, event_name, contact_name, contact_phone,
                             vehicle, driver_name, driver_phone,
                             minuto_text, gcal_event_id, gcal_calendar_id, calendar_category,
                             html_link=None):
    from app.models.event_timeline import EventTimeline, EventType
    from app.models.timeline_activity import TimelineActivity

    existing = db.query(EventTimeline).filter(
        EventTimeline.gcal_event_id == gcal_event_id
    ).first()
    if existing:
        return existing, False  # already created

    tl = EventTimeline(
        event_name=event_name,
        event_type=EventType.wedding,
        event_date=res.event_date,
        main_contact_name=contact_name,
        main_contact_phone=contact_phone,
        assigned_vehicle=vehicle,
        assigned_driver=driver_name,
        assigned_driver_phone=driver_phone,
        gcal_event_id=gcal_event_id,
        gcal_calendar_id=gcal_calendar_id,
        gcal_html_link=html_link,
        gcal_imported=True,
        calendar_category=calendar_category,
        reservation_id=res.id,
    )
    db.add(tl)
    db.flush()

    if minuto_text:
        for act_data in parse_timeline_activities(minuto_text):
            db.add(TimelineActivity(
                timeline_id=tl.id,
                time=act_data["time"],
                description=act_data["description"],
                display_order=act_data["display_order"],
            ))

    return tl, True


# ── Main ────────────────────────────────────────────────────────────────────────

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

    from app.database import SessionLocal
    from app.models.reservation import Reservation

    db = SessionLocal()

    if DRY_RUN:
        print("=== DRY RUN — no changes will be written ===\n")

    stats = {"updated": 0, "skipped": 0, "customers": 0, "timelines": 0, "activities": 0}

    for cal_id, meta in CALENDAR_MAP.items():
        cal_name = meta["name"]
        cal_category = meta["category"]

        print(f"\n── {cal_name} {'─' * (40 - len(cal_name))}")

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
                gcal_event_id = event.get("id", "")
                summary       = event.get("summary", "") or "Sin título"
                raw_desc      = event.get("description", "") or ""
                desc          = strip_html(raw_desc)
                html_link     = event.get("htmlLink")

                # Find existing reservation
                res = db.query(Reservation).filter(
                    Reservation.notes.contains(f"[gcal:{gcal_event_id}]")
                ).first()
                if not res:
                    stats["skipped"] += 1
                    continue

                clean_title  = _PREFIX_RE.sub("", summary).strip()

                # ── Extract fields ────────────────────────────────────────────
                total        = parse_valor(desc)
                deposit      = parse_deposit(desc)
                phone        = parse_phone(desc)
                contact_name = parse_contact_name(desc, summary)
                vehicle      = parse_vehicle(summary, desc)
                driver_name, driver_phone = parse_driver(desc)
                bride, groom = parse_couple_names(summary)
                minuto       = parse_minuto_block(desc)

                # Build special_instructions
                si_parts = []
                if vehicle:
                    si_parts.append(f"Vehículo: {vehicle}")
                if driver_name:
                    d_line = f"Conductor: {driver_name}"
                    if driver_phone:
                        d_line += f" · {driver_phone}"
                    si_parts.append(d_line)
                if minuto:
                    si_parts.append(minuto)
                special_instructions = "\n\n".join(si_parts) or None

                # ── Log ───────────────────────────────────────────────────────
                label = "[DRY RUN]" if DRY_RUN else "[OK]"
                print(
                    f"  {label} {clean_title[:45]:<45} "
                    f"total={total or '—':>10}  "
                    f"abono={deposit or '—':>10}  "
                    f"tel={phone or '—'}"
                )

                if DRY_RUN:
                    continue

                # ── Write reservation fields ───────────────────────────────────
                if total is not None:
                    res.total_amount = total
                if deposit is not None:
                    res.deposit_paid = deposit
                if special_instructions and not res.special_instructions:
                    res.special_instructions = special_instructions

                # ── Create/link Customer ───────────────────────────────────────
                if (contact_name or phone) and not res.customer_id:
                    customer = find_or_create_customer(
                        db, contact_name, phone, res.event_date,
                        bride_name=bride, groom_name=groom,
                    )
                    res.customer_id = customer.id
                    stats["customers"] += 1

                # ── Create EventTimeline + activities ──────────────────────────
                if minuto or contact_name or vehicle:
                    tl, created = create_or_skip_timeline(
                        db, res,
                        event_name=clean_title,
                        contact_name=contact_name,
                        contact_phone=phone,
                        vehicle=vehicle,
                        driver_name=driver_name,
                        driver_phone=driver_phone,
                        minuto_text=minuto,
                        gcal_event_id=gcal_event_id,
                        gcal_calendar_id=cal_id,
                        calendar_category=cal_category,
                        html_link=html_link,
                    )
                    # Backfill html_link on already-existing timelines
                    if not created and html_link and not tl.gcal_html_link:
                        tl.gcal_html_link = html_link
                    if created:
                        stats["timelines"] += 1
                        if minuto:
                            stats["activities"] += len(parse_timeline_activities(minuto))

                db.commit()
                stats["updated"] += 1

            page_token = resp.get("nextPageToken")
            if not page_token:
                break

    db.close()

    print(f"\n{'DRY RUN ' if DRY_RUN else ''}Done.")
    print(f"  Reservations updated : {stats['updated']}")
    print(f"  Skipped (not found)  : {stats['skipped']}")
    print(f"  Customers created    : {stats['customers']}")
    print(f"  Timelines created    : {stats['timelines']}")
    print(f"  Activities created   : {stats['activities']}")


if __name__ == "__main__":
    run()
