from datetime import date, datetime, time
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, ConfigDict

from app.models.reservation import ReservationStatus

_SCALARS = [
    "id", "reservation_number", "customer_id", "contact_id", "quote_id", "vehicle_id", "driver_id",
    "event_date", "start_time", "end_time", "total_amount", "deposit_paid", "status",
    "event_category", "gcal_imported",
    "special_instructions", "notes", "created_at", "updated_at",
]


def _build(r) -> dict:
    d = {f: getattr(r, f, None) for f in _SCALARS}
    d["remaining_balance"] = r.remaining_balance
    d["display_customer"] = r.display_customer
    d["display_contact"] = r.contact.full_name if r.contact else None
    d["display_vehicle"] = r.display_vehicle
    d["display_driver"] = r.display_driver
    tls = r.timelines if hasattr(r, "timelines") and r.timelines else []
    d["timeline_id"] = tls[0].id if tls else None
    d["timeline_event_name"] = tls[0].event_name if tls else None
    return d


class ReservationCreate(BaseModel):
    customer_id: Optional[int] = None
    contact_id: Optional[int] = None
    quote_id: Optional[int] = None
    vehicle_id: Optional[int] = None
    driver_id: Optional[int] = None
    event_date: date
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    total_amount: Decimal = Decimal("0")
    deposit_paid: Decimal = Decimal("0")
    status: ReservationStatus = ReservationStatus.lead
    event_category: str = "standard"
    special_instructions: Optional[str] = None
    notes: Optional[str] = None


class ReservationUpdate(BaseModel):
    customer_id: Optional[int] = None
    contact_id: Optional[int] = None
    quote_id: Optional[int] = None
    vehicle_id: Optional[int] = None
    driver_id: Optional[int] = None
    event_date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    total_amount: Optional[Decimal] = None
    deposit_paid: Optional[Decimal] = None
    status: Optional[ReservationStatus] = None
    event_category: Optional[str] = None
    special_instructions: Optional[str] = None
    notes: Optional[str] = None


class ReservationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    reservation_number: str
    customer_id: Optional[int] = None
    contact_id: Optional[int] = None
    quote_id: Optional[int] = None
    vehicle_id: Optional[int] = None
    driver_id: Optional[int] = None
    event_date: date
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    total_amount: Decimal
    deposit_paid: Decimal
    remaining_balance: Decimal
    status: ReservationStatus
    event_category: str = "standard"
    gcal_imported: bool = False
    special_instructions: Optional[str] = None
    notes: Optional[str] = None
    display_customer: str
    display_contact: Optional[str] = None
    display_vehicle: str
    display_driver: str
    timeline_id: Optional[int] = None
    timeline_event_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    @classmethod
    def build(cls, r) -> "ReservationRead":
        return cls.model_validate(_build(r))


class ReservationList(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    reservation_number: str
    display_customer: str
    display_vehicle: str
    display_driver: str
    event_date: date
    total_amount: Decimal
    deposit_paid: Decimal
    remaining_balance: Decimal
    status: ReservationStatus
    timeline_id: Optional[int] = None
    created_at: datetime

    @classmethod
    def build(cls, r) -> "ReservationList":
        return cls.model_validate(_build(r))


class ReservationPage(BaseModel):
    items: List[ReservationList]
    total: int
    page: int
    page_size: int
    pages: int
