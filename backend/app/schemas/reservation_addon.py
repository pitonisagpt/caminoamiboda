from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.services.reservation_addons import addon_company_amount, addon_provider_amount


class ReservationAddonCreate(BaseModel):
    addon_package_id: Optional[int] = None
    name: str
    description: Optional[str] = None
    provider_name: Optional[str] = None
    price: Decimal
    company_percentage: int = 0
    company_collects_payment: bool = True


class ReservationAddonUpdate(BaseModel):
    addon_package_id: Optional[int] = None
    name: Optional[str] = None
    description: Optional[str] = None
    provider_name: Optional[str] = None
    price: Optional[Decimal] = None
    company_percentage: Optional[int] = None
    company_collects_payment: Optional[bool] = None
    display_order: Optional[int] = None


class ReservationAddonRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    reservation_id: int
    addon_package_id: Optional[int] = None
    name: str
    description: Optional[str] = None
    provider_name: Optional[str] = None
    price: Decimal
    company_percentage: int
    company_collects_payment: bool
    display_order: int
    created_at: datetime
    # Derived — precomputed here so the frontend never repeats the math.
    company_amount: Decimal
    provider_amount: Decimal

    @classmethod
    def build(cls, a) -> "ReservationAddonRead":
        return cls(
            id=a.id,
            reservation_id=a.reservation_id,
            addon_package_id=a.addon_package_id,
            name=a.name,
            description=a.description,
            provider_name=a.provider_name,
            price=a.price,
            company_percentage=a.company_percentage,
            company_collects_payment=a.company_collects_payment,
            display_order=a.display_order,
            created_at=a.created_at,
            company_amount=addon_company_amount(a),
            provider_amount=addon_provider_amount(a),
        )
