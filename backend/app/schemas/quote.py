from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.models.quote import LocationZone, QuoteStatus


class QuoteBase(BaseModel):
    customer_id: Optional[int] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    vehicle_id: Optional[int] = None
    vehicle_description: Optional[str] = None
    event_date: date
    service_duration: Optional[str] = None
    location_zone: LocationZone = LocationZone.medellin
    pickup_location: Optional[str] = None
    ceremony_location: Optional[str] = None
    reception_location: Optional[str] = None
    total_price: Decimal
    deposit_amount: Optional[Decimal] = None
    payment_instructions: Optional[str] = None
    notes: Optional[str] = None
    extra_hours: int = 0
    addon_package_ids: Optional[list] = None
    addons_total: Decimal = Decimal("0")


class QuoteCreate(QuoteBase):
    pass


class QuoteUpdate(BaseModel):
    customer_id: Optional[int] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    vehicle_id: Optional[int] = None
    vehicle_description: Optional[str] = None
    event_date: Optional[date] = None
    service_duration: Optional[str] = None
    location_zone: Optional[LocationZone] = None
    pickup_location: Optional[str] = None
    ceremony_location: Optional[str] = None
    reception_location: Optional[str] = None
    total_price: Optional[Decimal] = None
    deposit_amount: Optional[Decimal] = None
    payment_instructions: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[QuoteStatus] = None


_QUOTE_SCALARS = [
    "id", "quote_number",
    "customer_id", "customer_name", "customer_phone",
    "vehicle_id", "vehicle_description",
    "event_date", "service_duration", "location_zone",
    "pickup_location", "ceremony_location", "reception_location",
    "total_price", "deposit_amount", "payment_instructions",
    "notes", "status", "pdf_path", "share_token",
    "extra_hours", "addon_package_ids", "addons_total",
    "created_at", "updated_at",
]


def _build_quote_dict(quote) -> dict:
    d = {f: getattr(quote, f, None) for f in _QUOTE_SCALARS}
    d["display_customer"] = quote.display_customer
    d["display_vehicle"] = quote.display_vehicle
    d["resolved_customer_phone"] = quote.resolved_customer_phone
    return d


class QuoteRead(QuoteBase):
    id: int
    quote_number: str
    status: QuoteStatus
    pdf_path: Optional[str] = None
    share_token: str
    display_customer: str
    display_vehicle: str
    created_at: datetime
    updated_at: datetime

    @classmethod
    def build(cls, quote) -> "QuoteRead":
        return cls.model_validate(_build_quote_dict(quote))


class QuoteList(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    quote_number: str
    display_customer: str
    display_vehicle: str
    resolved_customer_phone: Optional[str] = None
    event_date: date
    total_price: Decimal
    deposit_amount: Optional[Decimal] = None
    status: QuoteStatus
    pdf_path: Optional[str] = None
    created_at: datetime

    @classmethod
    def build(cls, quote) -> "QuoteList":
        return cls.model_validate(_build_quote_dict(quote))


class WhatsappTextResponse(BaseModel):
    text: str
