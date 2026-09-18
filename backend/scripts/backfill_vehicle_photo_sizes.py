#!/usr/bin/env python3
"""
Backfill: redimensiona/recomprime las fotos de vehículos que ya estaban
subidas antes de que existiera el resize automático en el endpoint de
subida (commit b249e3d, 2026-09-18). Motivado por una alerta real de
Render: 97% del ancho de banda del plan consumido en un mes y un reinicio
por exceder memoria — varios PNG de 26-28MB sin redimensionar sirviéndose
tal cual al catálogo público (vehículo 3 en particular).

Usa exactamente la misma función (resize_and_recompress,
app/core/image_utils.py) que ya corre en producción desde b249e3d para
las fotos nuevas, así que el resultado es idéntico al que ya tienen las
fotos subidas después de ese commit.

Nunca borra el archivo original — lo mueve a
/app/uploads/vehicle_photo_backfill_originals/<nombre>, fuera del mount
público de StaticFiles (así que deja de ser servible pero sigue
recuperable en el mismo disco). El skill /backup no cubre el disco de
producción (solo el stack local de Docker Compose), así que esta es la
única red de seguridad real para este script.

Salta una foto si redimensionar/recomprimir no la achica — cubre tanto
las ya redimensionadas como las que ya son livianas, sin necesitar un
chequeo de dimensiones aparte.

Naturalmente idempotente: una foto ya procesada por este script (o ya
subida después de b249e3d) no se va a achicar más en una corrida
posterior, así que se salta sola.

Uso:
    python scripts/backfill_vehicle_photo_sizes.py                     # dry-run, todos los vehículos
    python scripts/backfill_vehicle_photo_sizes.py --vehicle-id=3      # dry-run, solo el vehículo 3
    python scripts/backfill_vehicle_photo_sizes.py --vehicle-id=3 --confirm  # aplica de verdad, solo vehículo 3
    python scripts/backfill_vehicle_photo_sizes.py --confirm           # aplica de verdad, todos
"""

import argparse
import sys
import uuid
from pathlib import Path

sys.path.insert(0, "/app")

from app.database import SessionLocal
# Importa TODOS los módulos de modelos, no solo los que este script toca
# directamente — SQLAlchemy resuelve relationship() por nombre de clase en
# tiempo de mapeo, así que cualquier modelo referenciado transitivamente
# (Reservation -> EventTimeline -> ..., etc.) tiene que estar registrado
# antes del primer db.query(), sin importar si este script lo usa.
import app.models.addon_package              # noqa
import app.models.ai_assistant               # noqa
import app.models.billing_document           # noqa
import app.models.blog_post                  # noqa
import app.models.catalog_location           # noqa
import app.models.contact                    # noqa
import app.models.customer                   # noqa
import app.models.driver                     # noqa
import app.models.event_location             # noqa
import app.models.event_timeline             # noqa
import app.models.florist_photo              # noqa
import app.models.florist_settings           # noqa
import app.models.follow_up_message          # noqa
import app.models.instagram_post             # noqa
import app.models.media_consent              # noqa
import app.models.owner_settlement           # noqa
import app.models.owner_settlement_payment   # noqa
import app.models.quote                      # noqa
import app.models.reservation                # noqa
import app.models.reservation_addon          # noqa
import app.models.reservation_addon_payment  # noqa
import app.models.reservation_attachment     # noqa
import app.models.reservation_contract       # noqa
import app.models.reservation_payment        # noqa
import app.models.reservation_payment_schedule_item  # noqa
import app.models.reservation_vehicle        # noqa
import app.models.review                     # noqa
import app.models.service_order              # noqa
import app.models.timeline_activity          # noqa
import app.models.timeline_contact           # noqa
import app.models.user                       # noqa
import app.models.vehicle                    # noqa
import app.models.vehicle_owner              # noqa
import app.models.vehicle_owner_attachment   # noqa
import app.models.vehicle_owner_contract     # noqa
import app.models.vehicle_photo_provider     # noqa
from app.core.image_utils import resize_and_recompress
from app.models.vehicle_photo import VehiclePhoto

UPLOAD_DIR = Path("/app/uploads/vehicles")
ORIGINALS_BACKUP_DIR = Path("/app/uploads/vehicle_photo_backfill_originals")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--confirm", action="store_true", help="Aplica los cambios de verdad. Sin esto, solo reporta qué haría.")
    parser.add_argument("--vehicle-id", type=int, default=None, help="Limitar a un solo vehículo (para probar antes de correr contra todos).")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        q = db.query(VehiclePhoto)
        if args.vehicle_id is not None:
            q = q.filter(VehiclePhoto.vehicle_id == args.vehicle_id)
        photos = q.order_by(VehiclePhoto.vehicle_id, VehiclePhoto.display_order).all()
        scope = f" (vehículo {args.vehicle_id})" if args.vehicle_id is not None else ""
        print(f"{len(photos)} foto(s) candidata(s){scope}\n")

        if args.confirm:
            ORIGINALS_BACKUP_DIR.mkdir(parents=True, exist_ok=True)

        processed, skipped, failed = 0, 0, []
        saved_bytes = 0

        for photo in photos:
            path = UPLOAD_DIR / photo.file_name
            if not path.exists():
                print(f"foto {photo.id} (vehículo {photo.vehicle_id}): archivo no encontrado en disco, se salta")
                skipped += 1
                continue

            original = path.read_bytes()
            original_size = len(original)

            resized = resize_and_recompress(original)
            if resized is None:
                print(f"foto {photo.id} (vehículo {photo.vehicle_id}): animada o no se pudo procesar, se salta")
                skipped += 1
                continue
            # Exige al menos 10% de ahorro real, no solo "más chico" — una
            # foto ya procesada por este mismo script (o ya subida después
            # de b249e3d) puede variar unos bytes al recomprimirse de nuevo
            # por puro ruido de JPEG, sin ganar nada, y sin este piso el
            # script "encontraría trabajo" en cada corrida para siempre en
            # vez de ser realmente idempotente.
            if len(resized) >= original_size * 0.9:
                print(
                    f"foto {photo.id} (vehículo {photo.vehicle_id}): ya está optimizada "
                    f"({original_size / 1024:.0f}KB), se salta"
                )
                skipped += 1
                continue

            print(
                f"foto {photo.id} (vehículo {photo.vehicle_id}): "
                f"{original_size / 1024:.0f}KB -> {len(resized) / 1024:.0f}KB"
            )

            if args.confirm:
                new_name = f"{uuid.uuid4().hex}.jpg"
                new_path = UPLOAD_DIR / new_name
                try:
                    new_path.write_bytes(resized)
                    old_file_name = photo.file_name
                    photo.file_name = new_name
                    db.commit()
                    # Solo mueve el original una vez que el archivo nuevo ya
                    # está escrito Y la fila de la DB ya apunta al nuevo — así
                    # nunca queda un momento donde la foto servible no exista.
                    (UPLOAD_DIR / old_file_name).rename(ORIGINALS_BACKUP_DIR / old_file_name)
                except Exception as e:
                    db.rollback()
                    print(f"  FAILED — {e}")
                    failed.append(photo.id)
                    continue

            processed += 1
            saved_bytes += original_size - len(resized)

        verb = "Aplicadas" if args.confirm else "Se aplicarían"
        print(f"\n{verb}: {processed}")
        print(f"Saltadas: {skipped}")
        if failed:
            print(f"Fallidas: {failed}")
        saved_verb = "Ahorrados" if args.confirm else "Se ahorrarían"
        print(f"{saved_verb}: {saved_bytes / 1024 / 1024:.1f} MB")
        if not args.confirm:
            print("\n[dry-run] no se escribió nada — agregar --confirm para aplicar de verdad")
    finally:
        db.close()


if __name__ == "__main__":
    main()
