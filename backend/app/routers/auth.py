import threading
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.config import settings
from app.core.dependencies import get_current_user
from app.core.limiter import limiter
from app.database import get_db
from app.models.user import User
from app.schemas.user import LoginRequest, UserRead
from app.services.auth import create_access_token, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])

# --- account lockout ---
_lock = threading.Lock()
_failures: dict[str, list[datetime]] = {}
_WINDOW = timedelta(minutes=5)
_MAX_ATTEMPTS = 5


def _is_locked(email: str) -> bool:
    with _lock:
        cutoff = datetime.utcnow() - _WINDOW
        attempts = [t for t in _failures.get(email, []) if t > cutoff]
        _failures[email] = attempts
        return len(attempts) >= _MAX_ATTEMPTS


def _record_failure(email: str) -> None:
    with _lock:
        _failures.setdefault(email, []).append(datetime.utcnow())


def _clear_failures(email: str) -> None:
    with _lock:
        _failures.pop(email, None)


@router.post("/login", response_model=UserRead)
@limiter.limit("10/minute")
def login(request: Request, response: Response, payload: LoginRequest, db: Session = Depends(get_db)):
    if _is_locked(payload.email):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Demasiados intentos fallidos. Espera 5 minutos.",
        )

    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        _record_failure(payload.email)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario desactivado",
        )

    _clear_failures(payload.email)
    token = create_access_token(subject=user.email, role=user.role.value)
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        samesite="strict",
        max_age=settings.access_token_expire_minutes * 60,
    )
    return UserRead.model_validate(user)


@router.post("/logout", status_code=204)
def logout(response: Response):
    response.delete_cookie("access_token")


@router.get("/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)):
    return current_user
