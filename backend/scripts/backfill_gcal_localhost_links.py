#!/usr/bin/env python3
"""
Re-sync Google Calendar events whose "Ver reserva" description line still
points at http://localhost:5173 instead of the real production domain.

Between 2026-07-12 (when the link was added to the synced description,
commit 10b70a0c) and 2026-08-08 (when GOOGLE_CALENDAR_SYNC_ENABLED was
added, commit 3e19f85), running the backend locally — which has real
Google credentials in backend/.env — with a linked reservation edited its
timeline synced against the real Google Calendar with FRONTEND_URL still
set to localhost. sync_timeline() only rebuilds a description when
something re-triggers it, so any event not touched since then kept the
stale link.

This is safe and idempotent to re-run: sync_timeline() rebuilds the whole
description from current data every time, so re-running this on an event
already fixed by a later edit is a no-op in effect (same content).

DOES NOT touch gcal_imported=true timelines — those pre-date the app
(real business history back to 2018) and sync_timeline() itself refuses to
overwrite them (google_calendar_service.py). This script's own query never
selects them either, as a second, independent guard.

Must run somewhere settings.frontend_url actually resolves to
https://caminoamiboda.com — i.e. production, not local dev (local keeps
GOOGLE_CALENDAR_SYNC_ENABLED=false on purpose).

Usage:
    python scripts/backfill_gcal_localhost_links.py --dry-run
    python scripts/backfill_gcal_localhost_links.py
"""

import sys
import argparse

sys.path.insert(0, "/app")

from app.config import settings
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
import app.models.reservation            # noqa
import app.models.reservation_addon      # noqa
import app.models.reservation_payment    # noqa
import app.models.reservation_vehicle    # noqa
import app.models.review                 # noqa
import app.models.timeline_activity      # noqa
import app.models.user                   # noqa
import app.models.vehicle                # noqa
import app.models.vehicle_owner          # noqa
import app.models.vehicle_photo          # noqa
from app.models.event_timeline import EventTimeline
from app.services.google_calendar_service import sync_timeline, _gcal_configured, _sync_enabled


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    print(f"frontend_url = {settings.frontend_url!r}")
    if "localhost" in settings.frontend_url:
        print("ABORTING: frontend_url still points at localhost in this environment — "
              "run this against production, not local dev.")
        sys.exit(1)
    if not args.dry_run and not (_gcal_configured() and _sync_enabled()):
        print("ABORTING: Google Calendar sync isn't configured/enabled in this environment "
              "(_gcal_configured()={}, _sync_enabled()={}) — sync_timeline() would silently "
              "no-op on every row.".format(_gcal_configured(), _sync_enabled()))
        sys.exit(1)

    db = SessionLocal()
    try:
        rows = (
            db.query(EventTimeline)
            .filter(
                EventTimeline.gcal_event_id.isnot(None),
                EventTimeline.gcal_imported == False,  # noqa: E712
                EventTimeline.reservation_id.isnot(None),
            )
            .order_by(EventTimeline.id)
            .all()
        )
        print(f"{len(rows)} candidate timeline(s): {[t.id for t in rows]}\n")

        if args.dry_run:
            print("[dry-run] no changes made — nothing calls Google's API in this mode")
            return

        ok, failed = 0, []
        for tl in rows:
            try:
                sync_timeline(tl, db)
                print(f"timeline {tl.id} (reservation {tl.reservation_id}): synced")
                ok += 1
            except Exception as e:
                print(f"timeline {tl.id} (reservation {tl.reservation_id}): FAILED — {e}")
                failed.append(tl.id)

        print(f"\n{ok}/{len(rows)} synced.")
        if failed:
            print(f"Failed timeline ids: {failed}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
