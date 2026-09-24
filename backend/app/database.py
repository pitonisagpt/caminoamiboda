from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import settings

# Explicit pool sizing — the SQLAlchemy default (pool_size=5 + max_overflow=10
# = 15 concurrent connections) is what caused real 500s under a genuine burst:
# 31 concurrent requests to /api/vehicles produced 16 failures, matching
# 31 - 15 exactly. The Render Postgres plan here (0.1c-256mb) caps at 100
# total connections server-side, and this app runs a single Uvicorn worker
# (backend/Dockerfile.prod), so pool_size + max_overflow directly is the
# app's real concurrency ceiling. 40 leaves ample headroom below the 100
# server cap for Alembic's own connection at deploy time and any one-off
# admin script run over SSH. pool_pre_ping avoids errors from a connection
# Render's Postgres dropped while idle in the pool.
engine = create_engine(
    settings.database_url,
    pool_size=20,
    max_overflow=20,
    pool_pre_ping=True,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
