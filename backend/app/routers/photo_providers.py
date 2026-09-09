from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.dependencies import require_admin
from app.database import get_db
from app.models.photo_provider import PhotoProvider
from app.schemas.photo_provider import PhotoProviderCreate, PhotoProviderRead, PhotoProviderUpdate

# Admin-only, matching vehicle_photos.py: crediting a photo is only ever
# reachable from the vehicle photo editor, which is itself admin-only
# (vehicle CRUD is admin-only per CLAUDE.md), so the standalone directory
# CRUD here follows the same gate for consistency.
router = APIRouter(
    prefix="/api/photo-providers", tags=["photo-providers"], redirect_slashes=False,
    dependencies=[Depends(require_admin)],
)


@router.get("", response_model=List[PhotoProviderRead])
def list_photo_providers(search: Optional[str] = Query(None), db: Session = Depends(get_db)):
    q = db.query(PhotoProvider).order_by(PhotoProvider.name)
    if search:
        q = q.filter(PhotoProvider.name.ilike(f"%{search}%"))
    return q.all()


@router.post("", response_model=PhotoProviderRead, status_code=201)
def create_photo_provider(body: PhotoProviderCreate, db: Session = Depends(get_db)):
    provider = PhotoProvider(**body.model_dump())
    db.add(provider)
    db.commit()
    db.refresh(provider)
    return provider


@router.put("/{provider_id}", response_model=PhotoProviderRead)
def update_photo_provider(provider_id: int, body: PhotoProviderUpdate, db: Session = Depends(get_db)):
    provider = db.query(PhotoProvider).filter(PhotoProvider.id == provider_id).first()
    if not provider:
        raise HTTPException(404, "Proveedor no encontrado")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(provider, field, value)
    db.commit()
    db.refresh(provider)
    return provider


@router.delete("/{provider_id}", status_code=204)
def delete_photo_provider(provider_id: int, db: Session = Depends(get_db)):
    provider = db.query(PhotoProvider).filter(PhotoProvider.id == provider_id).first()
    if not provider:
        raise HTTPException(404, "Proveedor no encontrado")
    db.delete(provider)
    db.commit()
