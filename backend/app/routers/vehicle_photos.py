import io
import re
import unicodedata
import uuid
import zipfile
from pathlib import Path
from typing import List

import filetype
from fastapi import APIRouter, Depends, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.dependencies import require_admin
from app.database import get_db
from app.models.vehicle import Vehicle
from app.models.vehicle_photo import VehiclePhoto
from app.schemas.vehicle_photo import VehiclePhotoBatchUpdate, VehiclePhotoRead

UPLOAD_DIR = Path("/app/uploads/vehicles")
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

router = APIRouter(
    prefix="/api/vehicles",
    tags=["vehicle-photos"],
    dependencies=[Depends(require_admin)],
    redirect_slashes=False,
)


def _ensure_upload_dir():
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def _slug(value: str) -> str:
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-zA-Z0-9]+", "-", value).strip("-").lower()


def _build_zip_filename(vehicle: Vehicle) -> str:
    parts = [str(vehicle.year) if vehicle.year else None, vehicle.brand, vehicle.color, vehicle.body_type]
    slug = "-".join(_slug(p) for p in parts if p)
    return f"{slug or 'vehiculo'}.zip"


@router.post("/{vehicle_id}/photos", response_model=List[VehiclePhotoRead])
async def upload_photos(
    vehicle_id: int,
    files: List[UploadFile],
    db: Session = Depends(get_db),
):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")

    _ensure_upload_dir()

    max_order = db.query(func.max(VehiclePhoto.display_order)).filter(
        VehiclePhoto.vehicle_id == vehicle_id
    ).scalar() or -1

    created = []
    for i, file in enumerate(files):
        ext = Path(file.filename or "").suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            continue
        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=413, detail=f"El archivo '{file.filename}' excede el límite de 10 MB")
        kind = filetype.guess(content)
        if kind is None or kind.mime not in ALLOWED_MIME_TYPES:
            raise HTTPException(status_code=415, detail=f"El archivo '{file.filename}' no es una imagen válida")
        file_name = f"{uuid.uuid4().hex}{ext}"
        dest = UPLOAD_DIR / file_name
        dest.write_bytes(content)

        photo = VehiclePhoto(
            vehicle_id=vehicle_id,
            file_name=file_name,
            original_name=file.filename or file_name,
            display_order=max_order + 1 + i,
            is_visible=True,
        )
        db.add(photo)
        created.append(photo)

    db.commit()
    for p in created:
        db.refresh(p)
    return [VehiclePhotoRead.model_validate(p) for p in created]


@router.put("/{vehicle_id}/photos", response_model=List[VehiclePhotoRead])
def update_photos(
    vehicle_id: int,
    payload: VehiclePhotoBatchUpdate,
    db: Session = Depends(get_db),
):
    photo_ids = [p.id for p in payload.photos]
    photos = (
        db.query(VehiclePhoto)
        .filter(VehiclePhoto.vehicle_id == vehicle_id, VehiclePhoto.id.in_(photo_ids))
        .all()
    )
    photo_map = {p.id: p for p in photos}
    for update in payload.photos:
        if update.id in photo_map:
            photo_map[update.id].display_order = update.display_order
            photo_map[update.id].is_visible = update.is_visible
    db.commit()
    result = (
        db.query(VehiclePhoto)
        .filter(VehiclePhoto.vehicle_id == vehicle_id)
        .order_by(VehiclePhoto.display_order)
        .all()
    )
    return [VehiclePhotoRead.model_validate(p) for p in result]


@router.delete("/{vehicle_id}/photos/{photo_id}", status_code=204)
def delete_photo(
    vehicle_id: int,
    photo_id: int,
    db: Session = Depends(get_db),
):
    photo = (
        db.query(VehiclePhoto)
        .filter(VehiclePhoto.id == photo_id, VehiclePhoto.vehicle_id == vehicle_id)
        .first()
    )
    if not photo:
        raise HTTPException(status_code=404, detail="Foto no encontrada")
    try:
        (UPLOAD_DIR / photo.file_name).unlink(missing_ok=True)
    except Exception:
        pass
    db.delete(photo)
    db.commit()


@router.get("/{vehicle_id}/photos/zip")
def download_photos_zip(vehicle_id: int, db: Session = Depends(get_db)):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")

    photos = (
        db.query(VehiclePhoto)
        .filter(VehiclePhoto.vehicle_id == vehicle_id, VehiclePhoto.is_visible == True)  # noqa: E712
        .order_by(VehiclePhoto.display_order)
        .all()
    )
    if not photos:
        raise HTTPException(status_code=404, detail="Este vehículo no tiene fotos")

    buf = io.BytesIO()
    # Photos are already compressed (JPEG/PNG/WebP) — ZIP_STORED skips the
    # wasted deflate pass, which matters once a vehicle has 50+ photos.
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_STORED) as zf:
        for i, photo in enumerate(photos, start=1):
            path = UPLOAD_DIR / photo.file_name
            if not path.exists():
                continue
            zf.write(path, arcname=f"foto-{i}{Path(photo.file_name).suffix}")
    buf.seek(0)

    filename = _build_zip_filename(vehicle)
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
