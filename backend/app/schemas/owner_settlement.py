from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict


class OwnerSettlementCreate(BaseModel):
    reservation_id: int
    vehicle_id: Optional[int] = None
    owner_id: Optional[int] = None
    owner_percentage: int = 70
    notes: Optional[str] = None


class OwnerSettlementRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    settlement_number: str
    reservation_id: int
    vehicle_id: Optional[int]
    owner_id: Optional[int]
    reservation_value: Decimal
    owner_percentage: int
    owner_amount: Decimal
    company_amount: Decimal
    status: str
    notes: Optional[str]
    pdf_path: Optional[str]
    created_at: datetime
    updated_at: datetime

    # Denormalized for display
    display_reservation: Optional[str] = None
    display_vehicle: Optional[str] = None
    display_owner: Optional[str] = None

    @classmethod
    def build(cls, s) -> "OwnerSettlementRead":
        r = s.reservation
        v = s.vehicle
        o = s.owner
        return cls(
            id=s.id,
            settlement_number=s.settlement_number,
            reservation_id=s.reservation_id,
            vehicle_id=s.vehicle_id,
            owner_id=s.owner_id,
            reservation_value=s.reservation_value,
            owner_percentage=s.owner_percentage,
            owner_amount=s.owner_amount,
            company_amount=s.company_amount,
            status=s.status,
            notes=s.notes,
            pdf_path=s.pdf_path,
            created_at=s.created_at,
            updated_at=s.updated_at,
            display_reservation=r.reservation_number if r else None,
            display_vehicle=(
                f"{v.brand} {v.model_line or ''} {v.color or ''}".strip() if v else None
            ),
            display_owner=o.full_name if o else None,
        )


class OwnerSettlementList(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    settlement_number: str
    reservation_id: int
    reservation_value: Decimal
    owner_percentage: int
    owner_amount: Decimal
    company_amount: Decimal
    status: str
    pdf_path: Optional[str]
    created_at: datetime
    display_reservation: Optional[str] = None
    display_owner: Optional[str] = None

    @classmethod
    def build(cls, s) -> "OwnerSettlementList":
        r = s.reservation
        o = s.owner
        return cls(
            id=s.id,
            settlement_number=s.settlement_number,
            reservation_id=s.reservation_id,
            reservation_value=s.reservation_value,
            owner_percentage=s.owner_percentage,
            owner_amount=s.owner_amount,
            company_amount=s.company_amount,
            status=s.status,
            pdf_path=s.pdf_path,
            created_at=s.created_at,
            display_reservation=r.reservation_number if r else None,
            display_owner=o.full_name if o else None,
        )
