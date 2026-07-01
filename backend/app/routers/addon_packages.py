from typing import List, Optional
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_admin
from app.database import get_db
from app.models.addon_package import AddonPackage

router = APIRouter(prefix="/api/addon-packages", tags=["addon-packages"], redirect_slashes=False)


class AddonPackageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    type: str
    description: Optional[str] = None
    price: Decimal
    is_active: bool
    display_order: int


class AddonPackageCreate(BaseModel):
    name: str
    type: str
    description: Optional[str] = None
    price: Decimal
    display_order: int = 0


class AddonPackageUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[Decimal] = None
    is_active: Optional[bool] = None
    display_order: Optional[int] = None


@router.get("", response_model=List[AddonPackageRead])
def list_addon_packages(
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    q = db.query(AddonPackage)
    if not include_inactive:
        q = q.filter(AddonPackage.is_active == True)  # noqa: E712
    return q.order_by(AddonPackage.display_order, AddonPackage.id).all()


@router.get("/public", response_model=List[AddonPackageRead])
def list_addon_packages_public(db: Session = Depends(get_db)):
    return (
        db.query(AddonPackage)
        .filter(AddonPackage.is_active == True)  # noqa: E712
        .order_by(AddonPackage.display_order, AddonPackage.id)
        .all()
    )


@router.post("", response_model=AddonPackageRead, status_code=201)
def create_addon_package(
    data: AddonPackageCreate,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    pkg = AddonPackage(**data.model_dump())
    db.add(pkg)
    db.commit()
    db.refresh(pkg)
    return pkg


@router.put("/{pkg_id}", response_model=AddonPackageRead)
def update_addon_package(
    pkg_id: int,
    data: AddonPackageUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    pkg = db.get(AddonPackage, pkg_id)
    if not pkg:
        raise HTTPException(404, "Add-on no encontrado")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(pkg, k, v)
    db.commit()
    db.refresh(pkg)
    return pkg


@router.delete("/{pkg_id}", status_code=204)
def delete_addon_package(
    pkg_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    pkg = db.get(AddonPackage, pkg_id)
    if not pkg:
        raise HTTPException(404, "Add-on no encontrado")
    pkg.is_active = False
    db.commit()
