"""
Create stub Reservation records for EventTimeline rows that have no reservation_id.

Run:
  docker exec caminoamiboda-backend-1 python scripts/create_stub_reservations.py [--dry-run]
"""
import sys
import os
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

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

from app.database import SessionLocal
from app.models.event_timeline import EventTimeline
from app.models.reservation import Reservation
from app.models.customer import Customer

DRY_RUN = "--dry-run" in sys.argv

# calendar_category → (status, event_category)
CATEGORY_MAP = {
    "prospectos": ("lead", "standard"),
    "pendiente":  ("deposit_received", "standard"),
    "abono":      ("deposit_received", "standard"),
    "ok":         ("confirmed", "standard"),
    "obsequio":   ("completed", "obsequio"),
    "publicidad": ("completed", "publicidad"),
}


def _next_number(db, prefix: str) -> str:
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


def find_or_create_customer(db, name: str | None, phone: str | None, event_date) -> Customer | None:
    if not name and not phone:
        return None
    if phone:
        existing = db.query(Customer).filter(Customer.phone == phone).first()
        if existing:
            return existing
    c = Customer(
        main_contact_name=name or "Importado GCal",
        phone=phone,
        wedding_date=event_date,
        notes="[Importado de GCal — stub]",
    )
    db.add(c)
    db.flush()
    return c


def main():
    db = SessionLocal()
    try:
        orphans = db.query(EventTimeline).filter(EventTimeline.reservation_id.is_(None)).all()
        print(f"Found {len(orphans)} orphan timelines (reservation_id IS NULL)")
        if not orphans:
            print("Nothing to do.")
            return

        for t in orphans:
            status, event_category = CATEGORY_MAP.get(t.calendar_category, ("lead", "standard"))
            now = datetime.now()
            prefix = f"RES-{now.strftime('%Y%m')}-"
            res_number = _next_number(db, prefix)

            print(f"  {'[DRY] ' if DRY_RUN else ''}Timeline {t.id}: '{t.event_name}' {t.event_date} "
                  f"cat={t.calendar_category} → {res_number} status={status}")

            if DRY_RUN:
                continue

            customer = find_or_create_customer(db, t.main_contact_name, t.main_contact_phone, t.event_date)

            r = Reservation(
                reservation_number=res_number,
                event_date=t.event_date,
                status=status,
                event_category=event_category,
                customer_id=customer.id if customer else None,
                notes=t.notes,
                special_instructions=t.special_instructions,
                gcal_imported=t.gcal_imported,
            )
            db.add(r)
            db.flush()

            t.reservation_id = r.id
            db.flush()

        if not DRY_RUN:
            db.commit()
            print(f"\nDone. Created {len(orphans)} stub reservations and linked timelines.")
        else:
            db.rollback()
            print(f"\nDry run complete. Would create {len(orphans)} stub reservations.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
