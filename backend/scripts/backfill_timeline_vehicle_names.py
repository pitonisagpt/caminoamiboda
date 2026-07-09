#!/usr/bin/env python3
"""
Refresh event_timelines.assigned_vehicle/assigned_driver/assigned_driver_phone
from the linked reservation's current vehicle and driver (or owner acting as
driver), for timelines whose cached text is stale or was never populated.

Both fields are denormalized snapshots, only kept in sync by
_sync_linked_timelines() when a reservation's operational fields change, and
that function explicitly skips gcal_imported timelines. So timelines created
by the Google Calendar import never got assigned_driver populated when
owner_driver_id was set on the reservation, and any of these fields can drift
after editing the Vehicle/Driver/VehicleOwner record directly.

Usage:
    python scripts/backfill_timeline_vehicle_names.py [--dry-run]
"""

import sys
import argparse

sys.path.insert(0, "/app")

from app.database import SessionLocal
import app.models.addon_package          # noqa
import app.models.billing_document       # noqa
import app.models.blog_post              # noqa
import app.models.catalog_location       # noqa
import app.models.contact                # noqa
import app.models.customer               # noqa
import app.models.driver                 # noqa
import app.models.event_location         # noqa
import app.models.instagram_post         # noqa
import app.models.owner_settlement       # noqa
import app.models.owner_settlement_payment  # noqa
import app.models.quote                  # noqa
import app.models.reservation_payment    # noqa
import app.models.review                 # noqa
import app.models.timeline_activity      # noqa
import app.models.user                   # noqa
import app.models.vehicle                # noqa
import app.models.vehicle_owner          # noqa
import app.models.vehicle_photo          # noqa
from app.models.event_timeline import EventTimeline
from app.models.reservation import Reservation


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        rows = (
            db.query(EventTimeline, Reservation)
            .join(Reservation, Reservation.id == EventTimeline.reservation_id)
            .all()
        )

        changed = 0
        for tl, r in rows:
            live_vehicle = r.display_vehicle
            if live_vehicle and live_vehicle != "—" and tl.assigned_vehicle != live_vehicle:
                print(f"timeline {tl.id} (reservation {r.id}) vehicle: {tl.assigned_vehicle!r} -> {live_vehicle!r}")
                if not args.dry_run:
                    tl.assigned_vehicle = live_vehicle
                changed += 1

            driver = r.owner_driver if r.owner_driver_id else r.driver
            live_driver_name = driver.full_name if driver else None
            live_driver_phone = (driver.phone or getattr(driver, "whatsapp", None)) if driver else None
            if driver and tl.assigned_driver != live_driver_name:
                print(f"timeline {tl.id} (reservation {r.id}) driver: {tl.assigned_driver!r} -> {live_driver_name!r}")
                if not args.dry_run:
                    tl.assigned_driver = live_driver_name
                    tl.assigned_driver_phone = live_driver_phone
                changed += 1

        if args.dry_run:
            print(f"\n[dry-run] would update {changed} timelines")
        else:
            db.commit()
            print(f"\nUpdated {changed} timelines")
    finally:
        db.close()


if __name__ == "__main__":
    main()
