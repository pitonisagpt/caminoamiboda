"""
Seed initial addon packages (bouquets + extra hour).
Run: docker compose exec backend python scripts/seed_addon_packages.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.addon_package import AddonPackage

PACKAGES = [
    {"name": "Ramo Básico", "type": "bouquet", "description": "Ramo sencillo de flores frescas", "price": 150_000, "display_order": 1},
    {"name": "Ramo Estándar", "type": "bouquet", "description": "Ramo mediano con flores de temporada y follaje", "price": 250_000, "display_order": 2},
    {"name": "Ramo Premium", "type": "bouquet", "description": "Ramo grande con flores importadas y diseño personalizado", "price": 400_000, "display_order": 3},
    {"name": "Hora Adicional", "type": "extra_hour", "description": "Extensión de servicio por hora adicional", "price": 200_000, "display_order": 10},
]


def main():
    db = SessionLocal()
    try:
        inserted = 0
        for data in PACKAGES:
            exists = db.query(AddonPackage).filter(AddonPackage.name == data["name"]).first()
            if exists:
                print(f"  skip: {data['name']}")
                continue
            db.add(AddonPackage(**data))
            inserted += 1
            print(f"  + {data['name']}")
        db.commit()
        print(f"\nListo: {inserted} paquete(s) insertado(s).")
    finally:
        db.close()


if __name__ == "__main__":
    main()
