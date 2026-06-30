from contextlib import asynccontextmanager

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy.orm import Session

from app.config import settings
from app.core.limiter import limiter
from app.database import SessionLocal
from app.models.user import User, UserRole
from app.models.reservation_payment import ReservationPayment  # noqa: F401 — register with SQLAlchemy
from app.models.owner_settlement_payment import OwnerSettlementPayment  # noqa: F401 — register with SQLAlchemy
from app.routers import auth, billing_documents, blog, calendar, catalog_locations, contacts, customers, dashboard, drivers, finance, owner_settlements, quotes, reservations, timelines, users, vehicle_owners, vehicle_photos, vehicles
from app.services.auth import hash_password
from app.services.vehicle_seed import seed_vehicles
from app.models.vehicle import Vehicle

_DEFAULT_SECRET = "change-me-in-production-use-a-random-32-byte-hex"


def _seed_admin(db: Session) -> None:
    if db.query(User).count() == 0:
        password = settings.initial_admin_password
        if not password:
            print("⚠️  INITIAL_ADMIN_PASSWORD no está configurada — no se creó el usuario admin.")
            return
        admin = User(
            email="admin@caminoamiboda.com",
            hashed_password=hash_password(password),
            full_name="Administrador",
            role=UserRole.admin,
        )
        db.add(admin)
        db.commit()
        print("✅ Usuario admin creado: admin@caminoamiboda.com")


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.secret_key == _DEFAULT_SECRET:
        raise RuntimeError(
            "SECRET_KEY no ha sido configurada. "
            "Establece la variable de entorno SECRET_KEY con al menos 32 bytes aleatorios."
        )
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

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


class _HSTSMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response


app.add_middleware(_HSTSMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.allowed_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(dashboard.router)
app.include_router(billing_documents.router)
app.include_router(vehicles.router)
app.include_router(vehicle_photos.router)
app.include_router(customers.router)
app.include_router(contacts.router)
app.include_router(drivers.router)
app.include_router(vehicle_owners.router)
app.include_router(timelines.router)
app.include_router(quotes.router)
app.include_router(reservations.router)
app.include_router(finance.router)
app.include_router(owner_settlements.router)
app.include_router(calendar.router)
app.include_router(catalog_locations.router)
app.include_router(blog.router)

# Serve uploaded photos
_uploads_dir = Path("/app/uploads/vehicles")
_uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/api/uploads", StaticFiles(directory="/app/uploads"), name="uploads")


@app.get("/health")
def health():
    return {"status": "ok"}
