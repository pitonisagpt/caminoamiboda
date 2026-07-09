#!/usr/bin/env python3
"""
Populate lat/lng on event_locations that don't have them yet, by reusing
sync_to_catalog() (upsert into catalog_locations by name, geocode via the
Google Maps link or Nominatim if coords are missing) and copying the
resulting coordinates back onto the EventLocation row.

lat/lng on EventLocation are only set going forward, at create/update time
(see create_location/update_location in app/routers/timelines.py) — this
script is a one-time backfill for locations that already existed before
that wiring was added. Slow: Nominatim is throttled to ~1 request/1.1s per
location without a usable Google Maps link, so this can take a while for a
large backlog. Safe to re-run — it only touches rows missing lat or lng.

Usage:
    python scripts/backfill_location_coords.py [--dry-run]
"""

import sys
import argparse

sys.path.insert(0, "/app")

from app.database import SessionLocal
import app.models.addon_package          # noqa
import app.models.billing_document       # noqa
import app.models.blog_post              # noqa
import app.models.contact                # noqa
import app.models.customer               # noqa
import app.models.driver                 # noqa
import app.models.event_timeline         # noqa
import app.models.instagram_post         # noqa
import app.models.owner_settlement       # noqa
import app.models.owner_settlement_payment  # noqa
import app.models.quote                  # noqa
import app.models.reservation            # noqa
import app.models.reservation_payment    # noqa
import app.models.review                 # noqa
import app.models.timeline_activity      # noqa
import app.models.user                   # noqa
import app.models.vehicle                # noqa
import app.models.vehicle_owner          # noqa
import app.models.vehicle_photo          # noqa
from app.models.event_location import EventLocation
from app.routers.catalog_locations import sync_to_catalog


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        rows = (
            db.query(EventLocation)
            .filter((EventLocation.lat.is_(None)) | (EventLocation.lng.is_(None)))
            .all()
        )
        print(f"{len(rows)} locations missing coordinates")

        resolved = 0
        for loc in rows:
            catalog_loc = sync_to_catalog(db, loc)
            if catalog_loc.lat is not None and catalog_loc.lng is not None:
                print(f"location {loc.id} ({loc.location_name!r}): -> {catalog_loc.lat}, {catalog_loc.lng}")
                if not args.dry_run:
                    loc.lat, loc.lng = catalog_loc.lat, catalog_loc.lng
                resolved += 1
            else:
                print(f"location {loc.id} ({loc.location_name!r}): could not geocode")
            if not args.dry_run:
                db.commit()
            else:
                db.rollback()

        if args.dry_run:
            print(f"\n[dry-run] would resolve {resolved}/{len(rows)} locations")
        else:
            print(f"\nResolved {resolved}/{len(rows)} locations")
    finally:
        db.close()


if __name__ == "__main__":
    main()
