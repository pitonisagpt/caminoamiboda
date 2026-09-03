from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, ConfigDict

from app.core.urls import build_upload_url
from app.models.reservation import ReservationStatus
from app.models.timeline_activity import TimelineActivity
from app.services.event_span import effective_end_date, is_in_progress
from app.services.reservation_vehicles import (
    get_reservation_vehicles,
    rv_display_driver,
    rv_display_driver_phone,
    vehicle_display_name,
)


class VehicleBrief(BaseModel):
    id: int
    display_name: str
    license_plate: Optional[str] = None
    is_company_owned: bool = False
    owner_id: Optional[int] = None
    owner_name: Optional[str] = None
    owner_whatsapp: Optional[str] = None
    owner_whatsapp_username: Optional[str] = None
    photo_url: Optional[str] = None
    driver_id: Optional[int] = None
    owner_driver_id: Optional[int] = None
    display_driver: Optional[str] = None
    display_driver_phone: Optional[str] = None


class VehicleAssignmentIn(BaseModel):
    vehicle_id: int
    driver_id: Optional[int] = None
    owner_driver_id: Optional[int] = None

_SCALARS = [
    "id", "reservation_number", "customer_id", "contact_id", "quote_id", "vehicle_id", "driver_id",
    "owner_driver_id",
    "event_date", "total_amount", "deposit_paid", "status",
    "cancellation_reason",
    "event_category", "event_location", "gcal_imported",
    "is_tentative", "event_date_notes",
    "special_instructions", "notes",
    "decoration_details", "decoration_removal_date",
    "extra_hours", "addon_package_ids", "addons_total",
    "created_at", "updated_at",
]


def _build(r, db) -> dict:
    d = {f: getattr(r, f, None) for f in _SCALARS}
    d["remaining_balance"] = r.remaining_balance
    d["display_customer"] = r.display_customer
    d["display_contact"] = r.contact.full_name if r.contact else None
    d["contact_phone"] = r.contact.phone if r.contact else None
    d["contact_whatsapp_username"] = r.contact.whatsapp_username if r.contact else None
    d["contact_type"] = r.contact.contact_type if r.contact else None
    d["display_vehicle"] = r.display_vehicle
    d["customer_phone"]    = r.customer.phone    if r.customer else None
    d["customer_whatsapp"] = r.customer.whatsapp if r.customer else None
    d["customer_whatsapp_username"] = r.customer.whatsapp_username if r.customer else None
    d["display_driver"] = r.display_driver
    d["display_driver_phone"] = r.display_driver_phone
    d["display_driver_whatsapp_username"] = r.display_driver_whatsapp_username
    d["vehicle_license_plate"] = r.vehicle.license_plate if r.vehicle else None
    d["owner_driver_name"] = r.owner_driver.full_name if r.owner_driver else None
    d["owner_driver_phone"] = r.owner_driver.phone if r.owner_driver else None
    d["owner_id"] = r.vehicle.owner_id if r.vehicle else None
    d["owner_name"] = r.vehicle.owner_name if r.vehicle else None
    d["owner_whatsapp"] = r.vehicle.owner_contact if r.vehicle else None
    d["owner_whatsapp_username"] = r.vehicle.owner.whatsapp_username if r.vehicle and r.vehicle.owner else None
    d["vehicle_is_company_owned"] = r.vehicle.is_company_owned if r.vehicle else False
    if r.vehicle:
        photos = r.vehicle.photos if isinstance(r.vehicle.photos, list) else ([r.vehicle.photos] if r.vehicle.photos else [])
        first_photo = next((p for p in photos if p.is_visible), None)
        d["vehicle_photo_url"] = build_upload_url(f"/api/uploads/vehicles/{first_photo.file_name}") if first_photo else None
    else:
        d["vehicle_photo_url"] = None
    tls = r.timelines if hasattr(r, "timelines") and r.timelines else []
    d["timeline_id"] = tls[0].id if tls else None
    d["timeline_event_name"] = tls[0].event_name if tls else None
    # EventTimeline.activities (the ORM relationship) doesn't reliably behave
    # as a list here — same workaround used elsewhere (owner_settlements.py,
    # calendar.py): query TimelineActivity directly.
    activities = db.query(TimelineActivity).filter(TimelineActivity.timeline_id == tls[0].id).all() if tls else []
    d["event_end_date"] = effective_end_date(r.event_date, activities)
    d["is_in_progress"] = is_in_progress(r.event_date, d["event_end_date"], r.status)

    # Structured multi-vehicle field — additive. All the scalar vehicle/driver
    # fields above keep working unchanged, since Reservation.vehicle_id/
    # driver_id/owner_driver_id stay synced to the first (primary) vehicle
    # here (see reservation_vehicle.py / _set_reservation_vehicles).
    vehicles = []
    for rv in get_reservation_vehicles(r.id, db):
        v = rv.vehicle
        if not v:
            continue
        photos = v.photos if isinstance(v.photos, list) else ([v.photos] if v.photos else [])
        first_photo = next((p for p in photos if p.is_visible), None)
        vehicles.append(VehicleBrief(
            id=v.id,
            display_name=vehicle_display_name(v),
            license_plate=v.license_plate,
            is_company_owned=v.is_company_owned,
            owner_id=v.owner_id,
            owner_name=v.owner_name,
            owner_whatsapp=v.owner_contact,
            owner_whatsapp_username=v.owner.whatsapp_username if v.owner else None,
            photo_url=build_upload_url(f"/api/uploads/vehicles/{first_photo.file_name}") if first_photo else None,
            driver_id=rv.driver_id,
            owner_driver_id=rv.owner_driver_id,
            display_driver=rv_display_driver(rv),
            display_driver_phone=rv_display_driver_phone(rv),
        ))
    d["vehicles"] = vehicles
    return d


class ReservationCreate(BaseModel):
    customer_id: Optional[int] = None
    contact_id: Optional[int] = None
    quote_id: Optional[int] = None
    vehicle_id: Optional[int] = None
    driver_id: Optional[int] = None
    owner_driver_id: Optional[int] = None
    event_date: date
    total_amount: Decimal = Decimal("0")
    deposit_paid: Decimal = Decimal("0")
    status: ReservationStatus = ReservationStatus.lead
    cancellation_reason: Optional[str] = None
    event_category: str = "standard"
    event_location: Optional[str] = None
    is_tentative: bool = False
    event_date_notes: Optional[str] = None
    special_instructions: Optional[str] = None
    notes: Optional[str] = None
    decoration_details: Optional[str] = None
    decoration_removal_date: Optional[date] = None
    extra_hours: int = 0
    addon_package_ids: Optional[list] = None
    addons_total: Decimal = Decimal("0")
    # New multi-vehicle input — optional so existing callers that still only
    # send vehicle_id/driver_id/owner_driver_id keep working (a single
    # ReservationVehicle row gets created from those instead). When present,
    # this takes priority over the singular fields above.
    vehicles: Optional[List[VehicleAssignmentIn]] = None


class ReservationUpdate(BaseModel):
    customer_id: Optional[int] = None
    contact_id: Optional[int] = None
    quote_id: Optional[int] = None
    vehicle_id: Optional[int] = None
    driver_id: Optional[int] = None
    owner_driver_id: Optional[int] = None
    event_date: Optional[date] = None
    total_amount: Optional[Decimal] = None
    deposit_paid: Optional[Decimal] = None
    status: Optional[ReservationStatus] = None
    cancellation_reason: Optional[str] = None
    event_category: Optional[str] = None
    event_location: Optional[str] = None
    is_tentative: Optional[bool] = None
    event_date_notes: Optional[str] = None
    special_instructions: Optional[str] = None
    notes: Optional[str] = None
    decoration_details: Optional[str] = None
    decoration_removal_date: Optional[date] = None
    extra_hours: Optional[int] = None
    addon_package_ids: Optional[list] = None
    addons_total: Optional[Decimal] = None
    # None/omitted = don't touch the vehicle list; [] = clear it (same
    # exclude_unset convention as every other optional field here).
    vehicles: Optional[List[VehicleAssignmentIn]] = None


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
    event_end_date: date
    is_in_progress: bool = False
    total_amount: Decimal
    deposit_paid: Decimal
    remaining_balance: Decimal
    status: ReservationStatus
    cancellation_reason: Optional[str] = None
    event_category: str = "standard"
    event_location: Optional[str] = None
    gcal_imported: bool = False
    is_tentative: bool = False
    event_date_notes: Optional[str] = None
    special_instructions: Optional[str] = None
    notes: Optional[str] = None
    decoration_details: Optional[str] = None
    decoration_removal_date: Optional[date] = None
    display_customer: str
    display_contact: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_whatsapp_username: Optional[str] = None
    contact_type: Optional[str] = None
    display_vehicle: str
    vehicle_license_plate: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_whatsapp: Optional[str] = None
    customer_whatsapp_username: Optional[str] = None
    display_driver: str
    display_driver_phone: Optional[str] = None
    display_driver_whatsapp_username: Optional[str] = None
    owner_driver_name: Optional[str] = None
    owner_driver_phone: Optional[str] = None
    owner_id: Optional[int] = None
    owner_name: Optional[str] = None
    owner_whatsapp: Optional[str] = None
    owner_whatsapp_username: Optional[str] = None
    vehicle_is_company_owned: bool = False
    vehicle_photo_url: Optional[str] = None
    timeline_id: Optional[int] = None
    timeline_event_name: Optional[str] = None
    extra_hours: int = 0
    addon_package_ids: Optional[list] = None
    addons_total: Decimal = Decimal("0")
    vehicles: List[VehicleBrief] = []
    created_at: datetime
    updated_at: datetime
    gcal_synced: Optional[bool] = None

    @classmethod
    def build(cls, r, db, gcal_synced: Optional[bool] = None) -> "ReservationRead":
        d = _build(r, db)
        d["gcal_synced"] = gcal_synced
        return cls.model_validate(d)


class ReservationList(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    reservation_number: str
    customer_id: Optional[int] = None
    contact_id: Optional[int] = None
    display_customer: str
    display_contact: Optional[str] = None
    display_vehicle: str
    display_driver: str
    display_driver_phone: Optional[str] = None
    display_driver_whatsapp_username: Optional[str] = None
    vehicle_license_plate: Optional[str] = None
    owner_id: Optional[int] = None
    owner_name: Optional[str] = None
    owner_whatsapp: Optional[str] = None
    owner_whatsapp_username: Optional[str] = None
    event_date: date
    event_end_date: date
    is_in_progress: bool = False
    total_amount: Decimal
    deposit_paid: Decimal
    remaining_balance: Decimal
    status: ReservationStatus
    event_category: str = "standard"
    is_tentative: bool = False
    event_date_notes: Optional[str] = None
    vehicle_is_company_owned: bool = False
    vehicle_photo_url: Optional[str] = None
    vehicles: List[VehicleBrief] = []
    timeline_id: Optional[int] = None
    created_at: datetime

    @classmethod
    def build(cls, r, db) -> "ReservationList":
        return cls.model_validate(_build(r, db))


class ReservationPage(BaseModel):
    items: List[ReservationList]
    total: int
    page: int
    page_size: int
    pages: int
