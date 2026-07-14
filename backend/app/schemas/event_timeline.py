from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict

from app.models.event_timeline import EventType
from app.models.event_location import LocationType


# ── Locations ──────────────────────────────────────────────────────────────────

class LocationBase(BaseModel):
    location_name: str
    location_type: LocationType = LocationType.other
    address: Optional[str] = None
    google_maps_link: Optional[str] = None
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    notes: Optional[str] = None
    road_access_notes: Optional[str] = None
    display_order: int = 0


class LocationCreate(LocationBase):
    pass


class LocationUpdate(BaseModel):
    location_name: Optional[str] = None
    location_type: Optional[LocationType] = None
    address: Optional[str] = None
    google_maps_link: Optional[str] = None
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    notes: Optional[str] = None
    road_access_notes: Optional[str] = None
    display_order: Optional[int] = None


class LocationRead(LocationBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    timeline_id: int
    lat: Optional[float] = None
    lng: Optional[float] = None


# ── Activities ─────────────────────────────────────────────────────────────────

class ActivityBase(BaseModel):
    time: str
    day_number: int = 1
    description: str
    location_id: Optional[int] = None
    estimated_duration: Optional[str] = None
    notes: Optional[str] = None
    display_order: int = 0


class ActivityCreate(ActivityBase):
    pass


class ActivityUpdate(BaseModel):
    time: Optional[str] = None
    day_number: Optional[int] = None
    description: Optional[str] = None
    location_id: Optional[int] = None
    estimated_duration: Optional[str] = None
    notes: Optional[str] = None
    display_order: Optional[int] = None


class ActivityReorderItem(BaseModel):
    id: int
    display_order: int


class ActivityRead(ActivityBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    timeline_id: int


# ── Helpers ────────────────────────────────────────────────────────────────────

_TIMELINE_SCALARS = [
    "id", "event_name", "event_type", "event_date",
    "main_contact_name", "main_contact_phone",
    "assigned_vehicle", "assigned_driver", "assigned_driver_phone",
    "special_instructions", "notes", "gcal_event_id",
    "gcal_calendar_id", "gcal_html_link", "gcal_imported", "calendar_category", "reservation_id",
]


def _build_timeline_dict(timeline, locations, activities, extra_fields: list = None) -> dict:
    d = {f: getattr(timeline, f) for f in _TIMELINE_SCALARS + (extra_fields or [])}
    d["locations"] = [LocationRead.model_validate(loc, from_attributes=True) for loc in locations]
    d["activities"] = [ActivityRead.model_validate(act, from_attributes=True) for act in activities]
    contact = getattr(getattr(timeline, "reservation", None), "contact", None)
    d["planner_name"] = contact.full_name if contact else None
    d["planner_phone"] = contact.phone if contact else None
    return d


# ── Timeline ───────────────────────────────────────────────────────────────────

class TimelineBase(BaseModel):
    event_name: str
    event_type: EventType = EventType.wedding
    event_date: date
    main_contact_name: Optional[str] = None
    main_contact_phone: Optional[str] = None
    assigned_vehicle: Optional[str] = None
    assigned_driver: Optional[str] = None
    assigned_driver_phone: Optional[str] = None
    special_instructions: Optional[str] = None
    notes: Optional[str] = None


class TimelineCreate(TimelineBase):
    pass


class TimelineUpdate(BaseModel):
    event_name: Optional[str] = None
    event_type: Optional[EventType] = None
    event_date: Optional[date] = None
    main_contact_name: Optional[str] = None
    main_contact_phone: Optional[str] = None
    assigned_vehicle: Optional[str] = None
    assigned_driver: Optional[str] = None
    assigned_driver_phone: Optional[str] = None
    special_instructions: Optional[str] = None
    notes: Optional[str] = None


class TimelineRead(TimelineBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    gcal_event_id: Optional[str] = None
    gcal_calendar_id: Optional[str] = None
    gcal_html_link: Optional[str] = None
    gcal_imported: bool = False
    calendar_category: str = "prospectos"
    reservation_id: Optional[int] = None
    share_token_driver: str
    share_token_customer: str
    share_token_ops: str
    planner_name: Optional[str] = None
    planner_phone: Optional[str] = None
    locations: List[LocationRead] = []
    activities: List[ActivityRead] = []
    created_at: datetime
    updated_at: datetime

    @classmethod
    def build(cls, timeline, locations: list, activities: list) -> "TimelineRead":
        d = _build_timeline_dict(timeline, locations, activities, extra_fields=[
            "gcal_event_id", "gcal_calendar_id", "gcal_imported",
            "calendar_category", "reservation_id",
            "share_token_driver", "share_token_customer", "share_token_ops",
            "created_at", "updated_at",
        ])
        return cls.model_validate(d)


class TimelineList(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    event_name: str
    event_type: EventType
    event_date: date
    main_contact_name: Optional[str] = None
    assigned_vehicle: Optional[str] = None
    assigned_driver: Optional[str] = None
    assigned_driver_phone: Optional[str] = None
    share_token_driver: str
    created_at: datetime


# ── Public view (no share tokens exposed) ─────────────────────────────────────

class TimelinePublic(TimelineBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    locations: List[LocationRead] = []
    activities: List[ActivityRead] = []

    @classmethod
    def build(cls, timeline, locations: list, activities: list) -> "TimelinePublic":
        d = _build_timeline_dict(timeline, locations, activities)
        return cls.model_validate(d)
