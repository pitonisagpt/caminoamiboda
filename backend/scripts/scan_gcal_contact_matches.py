"""Scan GCal-imported reservations whose customer main_contact_name looks
like it's actually a wedding planner/venue/agency name that already exists
in `contacts`, but never got linked via Reservation.contact_id.

Root cause: gcal_enrich.py (a one-time historical backfill, run once on
2026-06-25, never scheduled) wrote the parsed contact name straight into
Customer.main_contact_name and never checked it against the `contacts`
table. This script is read-only — it never writes to the database, only
prints candidates for manual review (see
docs/desarrollo/planificadora-gcal-pendientes.md). Kept in the repo for
reference / to re-run later if useful (e.g. after a future calendar
import), same as recover_contact_names.py.

Usage:
    python scripts/scan_gcal_contact_matches.py
"""
import re
import sys
import unicodedata

sys.path.insert(0, "/app")

import app.main  # noqa - registers all SQLAlchemy models

from app.database import SessionLocal
from app.models.contact import Contact
from app.models.customer import Customer
from app.models.reservation import Reservation

# Same length-ratio guard used below: a match only counts if the shorter
# slug covers at least this fraction of the longer one — without it, short
# generic contact names (e.g. "Zona E") match inside unrelated long strings
# ("en el movich y llevarlos a zona e...") and drown the real matches.
MIN_RATIO = 0.5


def _slug(s: str) -> str:
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return re.sub(r"\s+", " ", s.lower().strip())


def _core_name(full_name: str) -> str:
    """Strip a trailing parenthetical annotation, e.g. "Sonia (Wedding
    Planner)" -> "Sonia", so matching isn't thrown off by the annotation."""
    return re.sub(r"\s*\(.*?\)\s*$", "", full_name).strip()


def main():
    db = SessionLocal()
    try:
        contacts = db.query(Contact).all()
        contact_slugs = [(c.id, c.full_name, _slug(_core_name(c.full_name))) for c in contacts]

        candidates = (
            db.query(Reservation, Customer)
            .join(Customer, Reservation.customer_id == Customer.id)
            .filter(Reservation.gcal_imported.is_(True), Reservation.contact_id.is_(None))
            .all()
        )
        print(f"Reservas importadas de GCal sin contact_id: {len(candidates)}")

        flagged = []
        for r, cust in candidates:
            name = (cust.main_contact_name or "").strip()
            if not name or name.lower().startswith("sin nombre"):
                continue
            ns = _slug(name)
            if len(ns) < 4:
                continue
            matches = []
            for cid, full, cs in contact_slugs:
                if len(cs) < 4:
                    continue
                shorter, longer = (ns, cs) if len(ns) <= len(cs) else (cs, ns)
                if shorter in longer and len(shorter) >= MIN_RATIO * len(longer):
                    matches.append((cid, full))
            if matches:
                flagged.append((r.id, r.reservation_number, cust.id, name, matches))

        print(f"Candidatos encontrados (nombre calza con un contacto existente): {len(flagged)}")
        for res_id, res_num, cust_id, name, matches in flagged:
            amb = " AMBIGUOUS" if len(matches) > 1 else ""
            print(f"  res {res_id} ({res_num}) cust {cust_id} '{name}' -> {[m[1] for m in matches]}{amb}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
