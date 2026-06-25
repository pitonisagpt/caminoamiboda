from contextlib import asynccontextmanager

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.user import User, UserRole
from app.routers import auth, billing_documents, customers, drivers, quotes, timelines, users, vehicle_owners, vehicle_photos, vehicles
from app.services.auth import hash_password
from app.services.vehicle_seed import seed_vehicles
from app.models.vehicle import Vehicle


def _seed_admin(db: Session) -> None:
    if db.query(User).count() == 0:
        admin = User(
            email="admin@caminoamiboda.com",
            hashed_password=hash_password("admin123"),
            full_name="Administrador",
            role=UserRole.admin,
        )
        db.add(admin)
        db.commit()
        print("✅ Usuario admin creado: admin@caminoamiboda.com / admin123  ← cambia la contraseña")


@asynccontextmanager
async def lifespan(app: FastAPI):
    db = SessionLocal()
    try:
        _seed_admin(db)
        if db.query(Vehicle).count() == 0:
            seed_vehicles(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="Camino a mi Boda API",
    version="1.0.0",
    redirect_slashes=False,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(billing_documents.router)
app.include_router(vehicles.router)
app.include_router(vehicle_photos.router)
app.include_router(customers.router)
app.include_router(drivers.router)
app.include_router(vehicle_owners.router)
app.include_router(timelines.router)
app.include_router(quotes.router)

# Serve uploaded photos
_uploads_dir = Path("/app/uploads/vehicles")
_uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/api/uploads", StaticFiles(directory="/app/uploads"), name="uploads")


@app.get("/health")
def health():
    return {"status": "ok"}
