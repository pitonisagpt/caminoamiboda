from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel


class FollowUpTemplateEntry(BaseModel):
    key: str
    label: str
    window_label: str
    window_status: str  # 'a_tiempo' | 'temprano' | 'atrasado'
    sent_at: Optional[datetime] = None
    text: str


class FollowUpPanelEntry(BaseModel):
    reservation_id: int
    reservation_number: str
    display_customer: str
    display_vehicle: str
    event_date: date
    days_to_event: int
    phone: Optional[str] = None
    current_key: Optional[str] = None
    templates: List[FollowUpTemplateEntry]


class MarkSentRequest(BaseModel):
    template_key: str
