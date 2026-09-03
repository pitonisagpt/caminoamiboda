import io
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Optional
from urllib.parse import quote

import filetype
import pillow_heif
from fastapi import APIRouter, Depends, HTTPException, UploadFile
from PIL import Image, ImageOps
from pydantic import BaseModel, ConfigDict, model_validator
from sqlalchemy.orm import Session

from app.core.dependencies import require_admin
from app.core.urls import build_upload_url
from app.database import get_db
from app.models.florist_photo import FloristPhoto
from app.models.florist_settings import FloristSettings

pillow_heif.register_heif_opener()

UPLOAD_DIR = Path("/app/uploads/florist")
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic", ".heif"}
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
HEIC_EXTENSIONS = {".heic", ".heif"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

# Seed values for the singleton row on first access — match what was
# previously hardcoded in FloristAllySection.tsx / ComoFuncionaPage.tsx.
DEFAULT_VENDOR_NAME = "Lluvia de Rosas"
DEFAULT_DESCRIPTION = (
    "¿Quieres decorar el auto con flores para tu boda? Te recomendamos a Lluvia de "
    "Rosas, nuestra floristería aliada — manejan tres niveles de paquetes de ramos "
    "para el auto, según tu presupuesto. Es totalmente opcional: si ya tienes tu "
    "floristería o decoradores, no hay ningún problema, solo asegúrate de que el "
    "ramo esté listo en el lugar de recogida. Si trabajas con Lluvia de Rosas, "
    "nosotros coordinamos directamente con ellos la decoración del auto."
)
DEFAULT_WHATSAPP_NUMBER = "573122565079"
DEFAULT_WHATSAPP_MESSAGE = "Hola! Me recomendó Camino a mi Boda para los ramos de mi boda."
DEFAULT_INSTAGRAM_URL = "https://www.instagram.com/floristerialluviaderosas"

router = APIRouter(prefix="/api/florist", tags=["florist"], redirect_slashes=False)


def _get_or_create_settings(db: Session) -> FloristSettings:
    settings = db.query(FloristSettings).first()
    if not settings:
        settings = FloristSettings(
            vendor_name=DEFAULT_VENDOR_NAME,
            description=DEFAULT_DESCRIPTION,
            whatsapp_number=DEFAULT_WHATSAPP_NUMBER,
            whatsapp_message=DEFAULT_WHATSAPP_MESSAGE,
            instagram_url=DEFAULT_INSTAGRAM_URL,
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


def _ensure_upload_dir():
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


class FloristPhotoRead(BaseModel):
    id: int
    file_name: str
    original_name: str
    label: str
    display_order: int
    is_visible: bool
    url: str = ""
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="after")
    def set_url(self) -> "FloristPhotoRead":
        self.url = build_upload_url(f"/api/uploads/florist/{self.file_name}")
        return self


class FloristPhotoUpdate(BaseModel):
    id: int
    display_order: int
    is_visible: bool
    label: str


class FloristPhotoBatchUpdate(BaseModel):
    photos: List[FloristPhotoUpdate]


class FloristPublicRead(BaseModel):
    vendor_name: str
    description: str
    description_en: Optional[str] = None
    instagram_url: str
    whatsapp_url: str
    photos: List[FloristPhotoRead]


class FloristAdminRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    vendor_name: str
    description: str
    description_en: Optional[str] = None
    whatsapp_number: str
    whatsapp_message: str
    instagram_url: str
    photos: List[FloristPhotoRead] = []


class FloristSettingsUpdate(BaseModel):
    vendor_name: str
    description: str
    description_en: Optional[str] = None
    whatsapp_number: str
    whatsapp_message: str
    instagram_url: str


def _whatsapp_url(number: str, message: str) -> str:
    return f"https://wa.me/{number}?text={quote(message, safe='')}"


@router.get("", response_model=FloristPublicRead)
def get_florist_public(db: Session = Depends(get_db)):
    settings = _get_or_create_settings(db)
    photos = (
        db.query(FloristPhoto)
        .filter(FloristPhoto.is_visible == True)  # noqa: E712
        .order_by(FloristPhoto.display_order)
        .all()
    )
    return FloristPublicRead(
        vendor_name=settings.vendor_name,
        description=settings.description,
        description_en=settings.description_en,
        instagram_url=settings.instagram_url,
        whatsapp_url=_whatsapp_url(settings.whatsapp_number, settings.whatsapp_message),
        photos=[FloristPhotoRead.model_validate(p) for p in photos],
    )


@router.get("/admin", response_model=FloristAdminRead)
def get_florist_admin(db: Session = Depends(get_db), _=Depends(require_admin)):
    settings = _get_or_create_settings(db)
    photos = db.query(FloristPhoto).order_by(FloristPhoto.display_order).all()
    data = FloristAdminRead.model_validate(settings)
    data.photos = [FloristPhotoRead.model_validate(p) for p in photos]
    return data


@router.put("", response_model=FloristAdminRead)
def update_florist_settings(
    data: FloristSettingsUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    settings = _get_or_create_settings(db)
    for k, v in data.model_dump().items():
        setattr(settings, k, v)
    db.commit()
    db.refresh(settings)
    photos = db.query(FloristPhoto).order_by(FloristPhoto.display_order).all()
    result = FloristAdminRead.model_validate(settings)
    result.photos = [FloristPhotoRead.model_validate(p) for p in photos]
    return result


@router.post("/photos", response_model=List[FloristPhotoRead], dependencies=[Depends(require_admin)])
def upload_photos(files: List[UploadFile], db: Session = Depends(get_db)):
    # Plain `def`, not `async def` — same fix as vehicle_photos.py's
    # upload_photos: the HEIC conversion below is CPU-bound and was
    # blocking the whole (single-worker, --workers 1) event loop while it
    # ran. See that file's comment for the full explanation.
    _ensure_upload_dir()

    max_order = db.query(FloristPhoto).count()

    created = []
    for i, file in enumerate(files):
        ext = Path(file.filename or "").suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            continue
        content = file.file.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=413, detail=f"El archivo '{file.filename}' excede el límite de 10 MB")

        if ext in HEIC_EXTENSIONS:
            try:
                img = Image.open(io.BytesIO(content))
                img = ImageOps.exif_transpose(img)
                if img.mode != "RGB":
                    img = img.convert("RGB")
                out = io.BytesIO()
                img.save(out, format="JPEG", quality=90)
                content = out.getvalue()
                ext = ".jpg"
            except Exception:
                raise HTTPException(status_code=415, detail=f"El archivo '{file.filename}' no es una imagen válida")
        else:
            kind = filetype.guess(content)
            if kind is None or kind.mime not in ALLOWED_MIME_TYPES:
                raise HTTPException(status_code=415, detail=f"El archivo '{file.filename}' no es una imagen válida")

        file_name = f"{uuid.uuid4().hex}{ext}"
        dest = UPLOAD_DIR / file_name
        dest.write_bytes(content)

        photo = FloristPhoto(
            file_name=file_name,
            original_name=file.filename or file_name,
            label="",
            display_order=max_order + i,
            is_visible=True,
        )
        db.add(photo)
        created.append(photo)

    db.commit()
    for p in created:
        db.refresh(p)
    return [FloristPhotoRead.model_validate(p) for p in created]


@router.put("/photos", response_model=List[FloristPhotoRead], dependencies=[Depends(require_admin)])
def update_photos(payload: FloristPhotoBatchUpdate, db: Session = Depends(get_db)):
    photo_ids = [p.id for p in payload.photos]
    photos = db.query(FloristPhoto).filter(FloristPhoto.id.in_(photo_ids)).all()
    photo_map = {p.id: p for p in photos}
    for update in payload.photos:
        if update.id in photo_map:
            photo_map[update.id].display_order = update.display_order
            photo_map[update.id].is_visible = update.is_visible
            photo_map[update.id].label = update.label
    db.commit()
    result = db.query(FloristPhoto).order_by(FloristPhoto.display_order).all()
    return [FloristPhotoRead.model_validate(p) for p in result]


@router.delete("/photos/{photo_id}", status_code=204, dependencies=[Depends(require_admin)])
def delete_photo(photo_id: int, db: Session = Depends(get_db)):
    photo = db.query(FloristPhoto).filter(FloristPhoto.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Foto no encontrada")
    try:
        (UPLOAD_DIR / photo.file_name).unlink(missing_ok=True)
    except Exception:
        pass
    db.delete(photo)
    db.commit()
