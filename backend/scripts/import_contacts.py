"""Import wedding planner contacts from the two source CSVs.

Usage:
    python scripts/import_contacts.py [--dry-run]
"""
import sys
import re
import unicodedata
from datetime import datetime

sys.path.insert(0, "/app")

import app.models.contact  # noqa – register model
import app.models.customer  # noqa
import app.models.driver    # noqa
import app.models.vehicle   # noqa
import app.models.vehicle_owner  # noqa
import app.models.quote          # noqa
import app.models.reservation    # noqa
import app.models.event_timeline # noqa
import app.models.event_location # noqa
import app.models.timeline_activity # noqa
import app.models.vehicle_photo    # noqa
import app.models.billing_document # noqa
import app.models.owner_settlement # noqa

from app.database import SessionLocal
from app.models.contact import Contact, ContactType, ContactStatus

DRY_RUN = "--dry-run" in sys.argv

# ── Venue keyword detection ────────────────────────────────────────────────────
VENUE_KEYWORDS = [
    "banquetes", "establo", "cielo", "villa", "casa de", "centro de",
    "el cielo", "granate", "santa maría", "santa maria", "flores de",
    "flores", "zona e",
]

def _is_venue(name: str) -> bool:
    n = name.lower()
    return any(kw in n for kw in VENUE_KEYWORDS)


def _normalize_phone(raw: str | None) -> str | None:
    if not raw or raw.strip().upper() in ("N/A", ""):
        return None
    return re.sub(r"\s+", "", raw.strip())


def _normalize_instagram(raw: str | None) -> str | None:
    if not raw or raw.strip().upper() in ("N/A", ""):
        return None
    handle = raw.strip()
    if handle and not handle.startswith("@"):
        handle = "@" + handle
    return handle


def _normalize_email(raw: str | None) -> str | None:
    if not raw or raw.strip().upper() in ("N/A", ""):
        return None
    return raw.strip().lower() or None


def _slug(name: str) -> str:
    """Lowercase, strip accents, collapse spaces — used for dedup."""
    s = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    return re.sub(r"\s+", " ", s.lower().strip())


# ── Source data ────────────────────────────────────────────────────────────────
# CSV 1: Name, Location, Phone, Instagram, Email
CSV1 = [
    ("Planner 360", "Medellin", "+573104339704", None, None),
    ("Zona E", "Llanogrande Rionegro", "+573107549139", None, None),
    ("Isabel Estrada Wedding Planner", "Medellin", "+573103795176", None, None),
    ("Nathalia Mira Wedding Planner", "Medellin", "+573207065874", None, None),
    ("Wedding Planner Anyi Londoño", "Medellin", "+573005724444", None, None),
    ("TOQUE ROSA EVENTOS", "Medellin", "+573185881154", None, None),
    ("Sara Muñoz Wedding Planner (SM Eventos)", "Envigado / Palmas", "+573128490410", None, None),
    ("Amor Infinito Diseños & Eventos", "Medellin", "+573015633093", None, None),
    ("Sara Gómez Wedding Planner", "Medellin", "+573128079730", None, None),
    ("La Madriguera De La Coneja", "Medellin", "+573192521945", None, None),
    ("LARES", "Llanogrande Rionegro", "+573104145800", None, None),
    ("BANQUETES LLANOGRANDE", "Llanogrande", "+573113876748", None, None),
    ("Astrid Vonk Wedding Planner", "Llanogrande", "+573104647876", None, None),
    ("Casa de Sueños Eventos", "Envigado", "+573167483917", None, None),
    ("Granate Eventos", "Rionegro", "+573167448481", None, None),
    ("El Establo Zona E", "Rionegro", "+573206750352", None, None),
    ("El Cielo Eventos Campestre", "Rionegro", "+573017896246", None, None),
    ("Centro de Eventos Villa Celeste", "Llanogrande", "+573107464848", None, None),
    ("Camila Henao Wedding Planner", "Medellin", "+573127399332", "@camilahenaowedding", "planner@camilahenaowedding.com"),
    ("Prana Eventos", "Medellin", "+573137585378", "@pranaeventos_", None),
    ("Bodaplanes", "Medellin", None, "@bodaplanes", None),
]

# CSV 2: Name, Location, Phone, Email, Instagram
CSV2 = [
    ("Alejandro Yepes", "Medellín & Destination", "+573148465772", "comercial@alejandroyepes.com", "@alejandroyepeswp"),
    ("VOWS by Laura", "Medellín & Destination", "+573133032044", "weddings@vowsbylaura.com", "@vowsbylaura"),
    ("Villa Celeste S.A.S.", "Llanogrande (Rionegro)", "+573107464848", "info@villaceleste.co", "@villaceleste.co"),
    ("Wink Eventos", "Medellín & Countryside", "+573242716944", "contacto@winkeventos.com", "@winkeventos"),
    ("Prestige Events", "Medellín Urban & Campestre", "+573113451637", "yulbreyner@prestigeevents.com.co", "@prestigeeventswp"),
    ("Fusión Tiempo Eventos", "Medellín & Llanogrande", "+573003534936", None, "@fusiontiempo"),
    ("Zona E (In-house Planners)", "Llanogrande (Luxury Estate)", None, "info@zonae.com", "@zonae"),
    ("Tu San Agustín", "Medellín & Envigado", None, "contacto@tusanagustin.com", "@tusanagustin"),
    ("Banquetes San Joaquín", "Medellín Metro Area", "+573104592680", "info@banquetessanjoaquin.com", "@banquetessanjoaquin"),
    ("Eliana Zapata (E|Z Weddings)", "Medellín & International", None, "info@elianazapata.com", "@elianazapatawp"),
    ("David Betancur", "Medellín (High-profile)", None, "info@davidbetancur.com", "@bodasdavidbetancur"),
    ("Alma Franco", "Medellín & Llanogrande", None, "info@almafranco.co", "@almafrancowp"),
    ("Madeira Planner", "Medellín & Luxury Coast", None, "hola@madeiraplanner.co", "@madeiraplanner"),
    ("Silvia Alzate Wedding Planner", "Medellín & Sabaneta", None, "contacto@silviaalzate.com", "@silviaalzatewp"),
    ("Santa María Eventos", "Medellín Campestre", None, None, "@santamariaeventosymobiliario"),
    ("Flores de Abril", "Llanogrande & Represa de la Fe", None, None, "@floresdeabril_wp"),
]

# ── Merge + dedup ──────────────────────────────────────────────────────────────
seen: dict[str, dict] = {}

def _add(name, location, phone, instagram, email):
    key = _slug(name)
    # Canonical name keys for known aliases
    if "villa celeste" in key:
        key = "villa celeste"
    if "zona e" in key and "in-house" in key:
        key = "zona e"
    if "zona e" in key:
        key = key  # keep as-is to merge both zona e rows

    if key in seen:
        # Merge: fill in missing fields from this row
        existing = seen[key]
        existing["phone"] = existing["phone"] or _normalize_phone(phone)
        existing["instagram"] = existing["instagram"] or _normalize_instagram(instagram)
        existing["email"] = existing["email"] or _normalize_email(email)
        if location and not existing["location"]:
            existing["location"] = location.strip()
    else:
        seen[key] = {
            "full_name": name.strip(),
            "location": location.strip() if location else None,
            "phone": _normalize_phone(phone),
            "instagram": _normalize_instagram(instagram),
            "email": _normalize_email(email),
            "contact_type": ContactType.venue if _is_venue(name) else ContactType.planner,
            "status": ContactStatus.prospect,
        }

for row in CSV1:
    _add(*row)
for row in CSV2:
    _add(*row)

contacts_to_import = list(seen.values())

# ── Preview ────────────────────────────────────────────────────────────────────
print(f"\n{'DRY RUN — ' if DRY_RUN else ''}Importing {len(contacts_to_import)} contacts:\n")
for c in contacts_to_import:
    t = "venue" if c["contact_type"] == ContactType.venue else "planner"
    print(f"  [{t:7s}] {c['full_name']} | {c['location'] or '—'} | {c['phone'] or '—'}")

if DRY_RUN:
    print("\nDry run complete. No changes written.\n")
    sys.exit(0)

# ── Write to DB ────────────────────────────────────────────────────────────────
db = SessionLocal()
try:
    existing_names = {_slug(c.full_name) for c in db.query(Contact.full_name).all()}
    created = 0
    skipped = 0
    for data in contacts_to_import:
        if _slug(data["full_name"]) in existing_names:
            print(f"  SKIP (already exists): {data['full_name']}")
            skipped += 1
            continue
        db.add(Contact(**data))
        created += 1
    db.commit()
    print(f"\nDone. Created {created} contacts, skipped {skipped} duplicates.\n")
finally:
    db.close()
