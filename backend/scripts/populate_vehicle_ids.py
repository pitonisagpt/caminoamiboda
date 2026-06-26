#!/usr/bin/env python3
"""
Populate reservations.vehicle_id from event_timelines.assigned_vehicle.

Maps free-text vehicle names to vehicle IDs using hardcoded high-confidence
rules. Ambiguous entries (multiple vehicles of same color/type) are skipped.

Usage:
    python scripts/populate_vehicle_ids.py [--dry-run]
"""

import sys
import argparse
from collections import defaultdict

sys.path.insert(0, "/app")

from app.database import SessionLocal
import sqlalchemy as sa

# ---------------------------------------------------------------------------
# Mapping: assigned_vehicle text (trimmed, case-sensitive) → vehicle_id
# ---------------------------------------------------------------------------
# Skipped categories:
#   Combi variants   – 3 combis (LLJ467, ABA091, KBA480) – ambiguous
#   Karmann Ghia     – 2 identical white Karmanns (ACG336, CAC464)
#   Jeep Gris Claro  – 2 identical grey Wranglers (HPL093, GEW097)
#   Chevelle/Malibu  – uncertain which Bel Air these map to
#   Multi-vehicle    – "Dos Combi", "3 combis", etc.
#   Non-vehicle text – timestamps, "FECHA PENDIENTE", etc.

MAPPING: dict[str, int] = {
    # ── Chevrolet Bel Air Rosa coral (id=3, LWC662) ─────────────────────
    "Rosa Coral": 3,
    "Rosa coral": 3,
    "Chevrolet Rosa Coral": 3,
    "Coral": 3,

    # ── Chevrolet Bel Air Blanco Almendra (id=4, KBB954) ─────────────────
    "Blanco Almendra": 4,
    "Chevrolet Blanco Almendra": 4,
    "Chevrolet Blanco Almendra 50": 4,
    "Chevrolet blanco almendra": 4,

    # ── Chevrolet Bel Air Beige 1953 (id=6, JRE367) ──────────────────────
    "Chevrolet Beige": 6,
    "Chevrolet Beige JC": 6,
    "Chevrolet 53": 6,  # year match: 1953

    # ── Chevrolet Bel Air Blanco y dorado 1958 (id=5, AAA316) ────────────
    "Chevrolet 58": 5,  # year match: 1958

    # ── Fiat Topolino Verde (id=9, KBC645) ───────────────────────────────
    "Topolino": 9,

    # ── Toyota FJ Beige (id=20, JKF396) ──────────────────────────────────
    "Toyota": 20,
    "Toyota Beige": 20,
    "Toyota FJ": 20,
    "TOYOTA BEIGE": 20,
    "FJ Beige": 20,

    # ── Mercedes Benz Gazelle Beige y negro (id=15, LKE279) ──────────────
    "Mercedes Beige": 15,
    "Mercedes beige": 15,

    # ── Mercedes Benz 280 SL Rojo (id=17, LEB084) ────────────────────────
    "Mercedes Rojo": 17,
    "Mercedes rojo": 17,

    # ── Royal Enfield Bullet 350 / Sidecar Negro (id=19, CQC33) ──────────
    "Sidecar": 19,
    "Sidecar negro": 19,
    "Moto Sidecar": 19,
    "Moto Sidecar negro": 19,
    "Moto sidecar negra": 19,
    "Moto negra": 19,

    # ── VW Escarabajo Negro Convertible (id=26, KAJ747) ──────────────────
    "Escarabajo": 26,
    "Ecarabajo": 26,
    "Escarabajo negro": 26,
    "Escarabajo negro convertible": 26,
    "VW Escarabajo Negro": 26,
    "VW Escarabajo negro": 26,
    "VW Negro": 26,
    "VW negro": 26,
    "VW negro convertible": 26,
    "Vw negro": 26,
    "Vocho Negro": 26,
    "Vocho negro": 26,
    "Negro Vocho": 26,
    "Negro VW": 26,
    "Volkswagen Negro Convertible": 26,
    "Volkswagen negro": 26,
    "Volkswagen negro convertible": 26,

    # ── VW Escarabajo Verde (id=27, JSA254) ──────────────────────────────
    "VW Verde JSA254": 27,
    "VW verde": 27,
    "Vocho Verde": 27,
}

SKIPPED_PATTERNS = [
    # Multiple vehicles
    "Dos ", "3 ", "Combi azul & Chiva", "Azul y Chiva",
    "VW negro & Combi Azul",
    # Combi (3 identical blue combis)
    "Combi", "combi", "Azul Celeste", "Azul celeste",
    # Karmann Ghia (2 identical white)
    "Karmann", "Karman",
    # Timestamp/internal text
    "*", "FECHA", "Casa Bali", "Hija de", "disponible",
    "en el camino", "Músico",
    # Jeep grey (2 identical)
    "Jeep gris", "Wrangler gris",
]


def reason_skipped(av: str) -> str:
    """Return the human-readable skip reason for an unmatched value."""
    al = av.lower()
    if any(av.startswith(p) or p.lower() in al for p in ["*", "FECHA", "Casa Bali",
            "Hija de", "disponible", "en el camino", "Músico"]):
        return "non-vehicle text"
    if "combi" in al or "azul celeste" in al or "azul y" in al or al.startswith("azul"):
        return "Combi – ambiguous (3 combis)"
    if "karmann" in al or "karman" in al:
        return "Karmann Ghia – ambiguous (2 identical white)"
    if "chevelle" in al or "malibu" in al or "malibú" in al:
        return "Chevelle/Malibu – uncertain Bel Air mapping"
    if "jeep gris" in al or "wrangler gris" in al:
        return "Jeep Gris Claro – ambiguous (2 identical)"
    if any(x in al for x in ["dos ", "3 combis", "& chiva", "& combi"]):
        return "multiple vehicles"
    return "no confident match"


def main(dry_run: bool) -> None:
    db = SessionLocal()
    try:
        updates: dict[int, int] = {}  # reservation_id → vehicle_id
        skipped: dict[str, list[int]] = defaultdict(list)  # av_text → reservation_ids

        # Fetch all (reservation_id, assigned_vehicle) pairs that lack vehicle_id
        rows = db.execute(sa.text("""
            SELECT et.reservation_id, TRIM(et.assigned_vehicle) as av
            FROM event_timelines et
            JOIN reservations r ON r.id = et.reservation_id
            WHERE et.assigned_vehicle IS NOT NULL
              AND TRIM(et.assigned_vehicle) != ''
              AND r.vehicle_id IS NULL
        """)).fetchall()

        for reservation_id, av in rows:
            if av in MAPPING:
                vid = MAPPING[av]
                if reservation_id not in updates:
                    updates[reservation_id] = vid
                else:
                    # Multiple timelines per reservation – keep first match
                    pass
            else:
                skipped[av].append(reservation_id)

        # Group updates by vehicle_id for reporting
        by_vehicle: dict[int, list[int]] = defaultdict(list)
        for rid, vid in updates.items():
            by_vehicle[vid].append(rid)

        # Fetch vehicle labels for display
        vid_set = tuple(by_vehicle.keys())
        if vid_set:
            veh_rows = db.execute(
                sa.text("SELECT id, brand, model_line, color, license_plate FROM vehicles WHERE id IN :ids"),
                {"ids": vid_set},
            ).fetchall()
        else:
            veh_rows = []
        veh_labels = {r[0]: f"{r[1]} {r[2]} {r[3]} ({r[4]})" for r in veh_rows}

        print("=" * 70)
        print(f"{'DRY RUN – ' if dry_run else ''}VEHICLE ID POPULATION PLAN")
        print("=" * 70)
        print(f"\nReservations to update: {len(updates)}")
        print(f"Vehicles matched:        {len(by_vehicle)}")
        print()

        for vid in sorted(by_vehicle.keys()):
            rids = by_vehicle[vid]
            label = veh_labels.get(vid, f"id={vid}")
            print(f"  vehicle_id={vid} ({label}): {len(rids)} reservations")

        # Apply updates
        if not dry_run:
            updated = 0
            for rid, vid in updates.items():
                db.execute(
                    sa.text("UPDATE reservations SET vehicle_id = :vid WHERE id = :rid"),
                    {"vid": vid, "rid": rid},
                )
                updated += 1
            db.commit()
            print(f"\n✅ Updated {updated} reservations.")
        else:
            print("\n(dry-run: no changes applied)")

        # Report skipped
        print()
        print("-" * 70)
        print(f"SKIPPED / UNMATCHED assigned_vehicle values ({len(skipped)} distinct):")
        print("-" * 70)
        skipped_sorted = sorted(skipped.items(), key=lambda x: -len(x[1]))
        for av, rids in skipped_sorted:
            reason = reason_skipped(av)
            print(f"  [{len(rids):3d}] {repr(av):<50} → {reason}")

    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    main(dry_run=args.dry_run)
