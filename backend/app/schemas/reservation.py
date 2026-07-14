from datetime import date, datetime, time
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, ConfigDict

from app.models.reservation import ReservationStatus

_SCALARS = [
    "id", "reservation_number", "customer_id", "contact_id", "quote_id", "vehicle_id", "driver_id",
    "owner_driver_id",
    "event_date", "start_time", "end_time", "total_amount", "deposit_paid", "status",
    "event_category", "event_location", "gcal_imported",
    "is_tentative", "event_date_notes",
    "special_instructions", "notes",
    "extra_hours", "addon_package_ids", "addons_total",
    "created_at", "updated_at",
]


def _build(r) -> dict:
    d = {f: getattr(r, f, None) for f in _SCALARS}
    d["remaining_balance"] = r.remaining_balance
    d["display_customer"] = r.display_customer
    d["display_contact"] = r.contact.full_name if r.contact else None
    d["contact_phone"] = r.contact.phone if r.contact else None
    d["contact_type"] = r.contact.contact_type if r.contact else None
    d["display_vehicle"] = r.display_vehicle
    d["customer_phone"]    = r.customer.phone    if r.customer else None
    d["customer_whatsapp"] = r.customer.whatsapp if r.customer else None
    d["display_driver"] = r.display_driver
    d["display_driver_phone"] = r.display_driver_phone
    d["vehicle_license_plate"] = r.vehicle.license_plate if r.vehicle else None
    d["owner_driver_name"] = r.owner_driver.full_name if r.owner_driver else None
    d["owner_driver_phone"] = r.owner_driver.phone if r.owner_driver else None
    d["owner_name"] = r.vehicle.owner_name if r.vehicle else None
    d["owner_whatsapp"] = r.vehicle.owner_contact if r.vehicle else None
    d["vehicle_is_company_owned"] = r.vehicle.is_company_owned if r.vehicle else False
    if r.vehicle:
        photos = r.vehicle.photos if isinstance(r.vehicle.photos, list) else ([r.vehicle.photos] if r.vehicle.photos else [])
        first_photo = next((p for p in photos if p.is_visible), None)
        d["vehicle_photo_url"] = f"/api/uploads/vehicles/{first_photo.file_name}" if first_photo else None
    else:
        d["vehicle_photo_url"] = None
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
    owner_driver_id: Optional[int] = None
    event_date: date
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    total_amount: Decimal = Decimal("0")
    deposit_paid: Decimal = Decimal("0")
    status: ReservationStatus = ReservationStatus.lead
    event_category: str = "standard"
    event_location: Optional[str] = None
    is_tentative: bool = False
    event_date_notes: Optional[str] = None
    special_instructions: Optional[str] = None
    notes: Optional[str] = None
    extra_hours: int = 0
    addon_package_ids: Optional[list] = None
    addons_total: Decimal = Decimal("0")


class ReservationUpdate(BaseModel):
    customer_id: Optional[int] = None
    contact_id: Optional[int] = None
    quote_id: Optional[int] = None
    vehicle_id: Optional[int] = None
    driver_id: Optional[int] = None
    owner_driver_id: Optional[int] = None
    event_date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    total_amount: Optional[Decimal] = None
    deposit_paid: Optional[Decimal] = None
    status: Optional[ReservationStatus] = None
    event_category: Optional[str] = None
    event_location: Optional[str] = None
    is_tentative: Optional[bool] = None
    event_date_notes: Optional[str] = None
    special_instructions: Optional[str] = None
    notes: Optional[str] = None
    extra_hours: Optional[int] = None
    addon_package_ids: Optional[list] = None
    addons_total: Optional[Decimal] = None


class ReservationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    reservation_number: str
    customer_id: Optional[int] = None
    contact_id: Optional[int] = None
    quote_id: Optional[int] = None
    vehicle_id: Optional[int] = None
    driver_id: Optional[int] = None
    owner_driver_id: Optional[int] = None
    event_date: date
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    total_amount: Decimal
    deposit_paid: Decimal
    remaining_balance: Decimal
    status: ReservationStatus
    event_category: str = "standard"
    event_location: Optional[str] = None
    gcal_imported: bool = False
    is_tentative: bool = False
    event_date_notes: Optional[str] = None
    special_instructions: Optional[str] = None
    notes: Optional[str] = None
    display_customer: str
    display_contact: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_type: Optional[str] = None
    display_vehicle: str
    vehicle_license_plate: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_whatsapp: Optional[str] = None
    display_driver: str
    display_driver_phone: Optional[str] = None
    owner_driver_name: Optional[str] = None
    owner_driver_phone: Optional[str] = None
    owner_name: Optional[str] = None
    owner_whatsapp: Optional[str] = None
    vehicle_is_company_owned: bool = False
    vehicle_photo_url: Optional[str] = None
    timeline_id: Optional[int] = None
    timeline_event_name: Optional[str] = None
    extra_hours: int = 0
    addon_package_ids: Optional[list] = None
    addons_total: Decimal = Decimal("0")
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
    display_driver_phone: Optional[str] = None
    vehicle_license_plate: Optional[str] = None
    owner_name: Optional[str] = None
    owner_whatsapp: Optional[str] = None
    event_date: date
    total_amount: Decimal
    deposit_paid: Decimal
    remaining_balance: Decimal
    status: ReservationStatus
    is_tentative: bool = False
    event_date_notes: Optional[str] = None
    vehicle_is_company_owned: bool = False
    vehicle_photo_url: Optional[str] = None
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
