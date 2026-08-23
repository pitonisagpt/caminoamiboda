import uuid
from pathlib import Path
from typing import List

import filetype
from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.dependencies import require_admin
from app.database import get_db
from app.models.vehicle_owner import VehicleOwner
from app.models.vehicle_owner_attachment import VehicleOwnerAttachment
from app.schemas.vehicle_owner_attachment import VehicleOwnerAttachmentRead, VehicleOwnerAttachmentUpdate

UPLOAD_DIR = Path("/app/uploads/vehicle_owners")
ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_MIME_TYPES = {"application/pdf", "image/jpeg", "image/png", "image/webp"}
ALLOWED_CATEGORIES = {"contract", "cedula", "rut", "other"}
MAX_FILE_SIZE = 15 * 1024 * 1024  # 15 MB

# Vehicle owners are admin-only across the whole system (CLAUDE.md), so their
# documents follow the same boundary — unlike reservation_attachments.py,
# which is open to any authenticated user.
router = APIRouter(
    prefix="/api/vehicle-owners",
    tags=["vehicle-owner-attachments"],
    dependencies=[Depends(require_admin)],
    redirect_slashes=False,
)


def _ensure_upload_dir():
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def _get_owner(owner_id: int, db: Session) -> VehicleOwner:
    owner = db.query(VehicleOwner).filter(VehicleOwner.id == owner_id).first()
    if not owner:
        raise HTTPException(status_code=404, detail="Propietario no encontrado")
    return owner


@router.get("/{owner_id}/attachments", response_model=List[VehicleOwnerAttachmentRead])
def list_attachments(owner_id: int, db: Session = Depends(get_db)):
    _get_owner(owner_id, db)
    rows = (
        db.query(VehicleOwnerAttachment)
        .filter(VehicleOwnerAttachment.owner_id == owner_id)
        .order_by(VehicleOwnerAttachment.uploaded_at.desc())
        .all()
    )
    return [VehicleOwnerAttachmentRead.model_validate(r) for r in rows]


@router.post("/{owner_id}/attachments", response_model=List[VehicleOwnerAttachmentRead])
async def upload_attachments(
    owner_id: int,
    files: List[UploadFile],
    category: str = Form("other"),
    db: Session = Depends(get_db),
):
    _get_owner(owner_id, db)
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

        attachment = VehicleOwnerAttachment(
            owner_id=owner_id,
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
    return [VehicleOwnerAttachmentRead.model_validate(a) for a in created]


@router.patch("/{owner_id}/attachments/{attachment_id}", response_model=VehicleOwnerAttachmentRead)
def update_attachment(owner_id: int, attachment_id: int, body: VehicleOwnerAttachmentUpdate, db: Session = Depends(get_db)):
    if body.category not in ALLOWED_CATEGORIES:
        raise HTTPException(status_code=422, detail=f"Categoría inválida: {body.category}")
    attachment = (
        db.query(VehicleOwnerAttachment)
        .filter(VehicleOwnerAttachment.id == attachment_id, VehicleOwnerAttachment.owner_id == owner_id)
        .first()
    )
    if not attachment:
        raise HTTPException(status_code=404, detail="Adjunto no encontrado")
    attachment.category = body.category
    db.commit()
    db.refresh(attachment)
    return VehicleOwnerAttachmentRead.model_validate(attachment)


@router.delete("/{owner_id}/attachments/{attachment_id}", status_code=204)
def delete_attachment(owner_id: int, attachment_id: int, db: Session = Depends(get_db)):
    attachment = (
        db.query(VehicleOwnerAttachment)
        .filter(VehicleOwnerAttachment.id == attachment_id, VehicleOwnerAttachment.owner_id == owner_id)
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
