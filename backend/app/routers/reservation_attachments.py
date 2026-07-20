import uuid
from pathlib import Path
from typing import List

import filetype
from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.reservation import Reservation
from app.models.reservation_attachment import ReservationAttachment
from app.schemas.reservation_attachment import ReservationAttachmentRead, ReservationAttachmentUpdate

UPLOAD_DIR = Path("/app/uploads/reservations")
ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_MIME_TYPES = {"application/pdf", "image/jpeg", "image/png", "image/webp"}
ALLOWED_CATEGORIES = {"contract", "receipt", "photo", "other"}
MAX_FILE_SIZE = 15 * 1024 * 1024  # 15 MB

router = APIRouter(
    prefix="/api/reservations",
    tags=["reservation-attachments"],
    dependencies=[Depends(get_current_user)],
    redirect_slashes=False,
)


def _ensure_upload_dir():
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def _get_reservation(reservation_id: int, db: Session) -> Reservation:
    reservation = db.query(Reservation).filter(Reservation.id == reservation_id).first()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    return reservation


@router.get("/{reservation_id}/attachments", response_model=List[ReservationAttachmentRead])
def list_attachments(reservation_id: int, db: Session = Depends(get_db)):
    _get_reservation(reservation_id, db)
    rows = (
        db.query(ReservationAttachment)
        .filter(ReservationAttachment.reservation_id == reservation_id)
        .order_by(ReservationAttachment.uploaded_at.desc())
        .all()
    )
    return [ReservationAttachmentRead.model_validate(r) for r in rows]


@router.post("/{reservation_id}/attachments", response_model=List[ReservationAttachmentRead])
async def upload_attachments(
    reservation_id: int,
    files: List[UploadFile],
    category: str = Form("other"),
    db: Session = Depends(get_db),
):
    _get_reservation(reservation_id, db)
    if category not in ALLOWED_CATEGORIES:
        raise HTTPException(status_code=422, detail=f"Categoría inválida: {category}")

    _ensure_upload_dir()

    created = []
    for file in files:
        ext = Path(file.filename or "").suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(status_code=415, detail=f"'{file.filename}': tipo de archivo no permitido (PDF, JPG, PNG, WEBP)")
        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=413, detail=f"'{file.filename}' excede el límite de 15 MB")
        kind = filetype.guess(content)
        if kind is None or kind.mime not in ALLOWED_MIME_TYPES:
            raise HTTPException(status_code=415, detail=f"'{file.filename}' no es un archivo válido (PDF, JPG, PNG, WEBP)")

        file_name = f"{uuid.uuid4().hex}{ext}"
        (UPLOAD_DIR / file_name).write_bytes(content)

        attachment = ReservationAttachment(
            reservation_id=reservation_id,
            file_name=file_name,
            original_name=file.filename or file_name,
            content_type=kind.mime,
            size_bytes=len(content),
            category=category,
        )
        db.add(attachment)
        created.append(attachment)

    db.commit()
    for a in created:
        db.refresh(a)
    return [ReservationAttachmentRead.model_validate(a) for a in created]


@router.patch("/{reservation_id}/attachments/{attachment_id}", response_model=ReservationAttachmentRead)
def update_attachment(reservation_id: int, attachment_id: int, body: ReservationAttachmentUpdate, db: Session = Depends(get_db)):
    if body.category not in ALLOWED_CATEGORIES:
        raise HTTPException(status_code=422, detail=f"Categoría inválida: {body.category}")
    attachment = (
        db.query(ReservationAttachment)
        .filter(ReservationAttachment.id == attachment_id, ReservationAttachment.reservation_id == reservation_id)
        .first()
    )
    if not attachment:
        raise HTTPException(status_code=404, detail="Adjunto no encontrado")
    attachment.category = body.category
    db.commit()
    db.refresh(attachment)
    return ReservationAttachmentRead.model_validate(attachment)


@router.delete("/{reservation_id}/attachments/{attachment_id}", status_code=204)
def delete_attachment(reservation_id: int, attachment_id: int, db: Session = Depends(get_db)):
    attachment = (
        db.query(ReservationAttachment)
        .filter(ReservationAttachment.id == attachment_id, ReservationAttachment.reservation_id == reservation_id)
        .first()
    )
    if not attachment:
        raise HTTPException(status_code=404, detail="Adjunto no encontrado")
    try:
        (UPLOAD_DIR / attachment.file_name).unlink(missing_ok=True)
    except Exception:
        pass
    db.delete(attachment)
    db.commit()
