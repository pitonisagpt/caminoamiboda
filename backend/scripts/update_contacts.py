"""Apply researched Instagram handles and phone numbers to contacts.

Usage:
    python scripts/update_contacts.py [--dry-run]
"""
import sys
import unicodedata
import re

sys.path.insert(0, "/app")

import app.models.contact          # noqa
import app.models.customer         # noqa
import app.models.driver           # noqa
import app.models.vehicle          # noqa
import app.models.vehicle_photo    # noqa
import app.models.vehicle_owner    # noqa
import app.models.quote            # noqa
import app.models.reservation      # noqa
import app.models.event_timeline   # noqa
import app.models.event_location   # noqa
import app.models.timeline_activity # noqa
import app.models.billing_document # noqa
import app.models.owner_settlement # noqa

from app.database import SessionLocal
from app.models.contact import Contact

DRY_RUN = "--dry-run" in sys.argv


def _slug(name: str) -> str:
    s = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    return re.sub(r"\s+", " ", s.lower().strip())


# Updates: (name_fragment, field, value) or (name_fragment, field, value, exact)
# exact=True matches the slug exactly rather than as a substring
UPDATES = [
    # ── Instagram handles (researched) ────────────────────────────────────────
    ("Isabel Estrada",             "instagram", "@isabelestradaplanner"),
    ("Anyi Londoño",               "instagram", "@anyilondonoeventplanner"),
    ("TOQUE ROSA",                 "instagram", "@toquerosaeventos"),
    ("Amor Infinito",              "instagram", "@amorinfinito_eventos"),
    ("La Madriguera",              "instagram", "@lamadrigueradelaconeja"),
    ("BANQUETES LLANOGRANDE",      "instagram", "@banquetesllanogrande"),
    ("Astrid Vonk",                "instagram", "@astrid_vonk"),
    ("Casa de Sueños",             "instagram", "@casadesuenos"),
    ("Granate Eventos",            "instagram", "@granateeventos"),
    ("El Establo",                 "instagram", "@salonelestablo"),
    ("El Cielo",                   "instagram", "@elcieloeventos"),

    # ── Phone numbers (researched from websites) ──────────────────────────────
    ("Bodaplanes",                 "phone",     "+573146170170"),
    ("zona e",                     "phone",     "+573117797524", True),  # exact slug
    ("Tu San Agustín",             "phone",     "+573246599704"),
    ("Eliana Zapata",              "phone",     "+573012417799"),
    ("David Betancur",             "phone",     "+573202911060"),
    ("Alma Franco",                "phone",     "+573003791654"),
    ("Madeira Planner",            "phone",     "+573054841356"),
    ("Silvia Alzate",              "phone",     "+573153774488"),
    ("Flores de Abril",            "phone",     "+573017378783"),
]


db = SessionLocal()
try:
    all_contacts = db.query(Contact).all()
    name_map = {_slug(c.full_name): c for c in all_contacts}

    applied = 0
    skipped = 0

    for entry in UPDATES:
        fragment, field, value = entry[0], entry[1], entry[2]
        exact = len(entry) > 3 and entry[3] is True
        slug_frag = _slug(fragment)
        if exact:
            matches = [c for slug, c in name_map.items() if slug == slug_frag]
        else:
            matches = [c for slug, c in name_map.items() if slug_frag in slug]

        if not matches:
            print(f"  NOT FOUND: '{fragment}'")
            skipped += 1
            continue

        if len(matches) > 1:
            print(f"  AMBIGUOUS: '{fragment}' matched {[c.full_name for c in matches]}")
            skipped += 1
            continue

        contact = matches[0]
        old = getattr(contact, field)

        if old and old == value:
            print(f"  SKIP (already set): {contact.full_name} → {field}={value}")
            skipped += 1
            continue

        print(f"  UPDATE: {contact.full_name} → {field}: {old or '—'} → {value}")
        if not DRY_RUN:
            setattr(contact, field, value)
        applied += 1

    if not DRY_RUN:
        db.commit()

    print(f"\n{'[DRY RUN] ' if DRY_RUN else ''}Applied {applied} updates, skipped {skipped}.\n")
finally:
    db.close()
