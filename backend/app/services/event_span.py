from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo


def max_day_number(activities) -> int:
    """Highest day_number across a timeline's activities (1 if none/absent)."""
    return max((getattr(a, "day_number", 1) or 1 for a in (activities or [])), default=1)


def effective_end_date(event_date: date, activities) -> date:
    """Last calendar date actually occupied by an event, given its activities' day_number."""
    return event_date + timedelta(days=max_day_number(activities) - 1)


def is_in_progress(event_date: date, end_date: date, status: str) -> bool:
    """Whether a (possibly multi-day) event is happening right now — computed
    from dates, never a stored flag, so it never needs manual updating as an
    event starts/ends. Not shown for cancelled/completed reservations even if
    today falls inside their date range."""
    if status in ("cancelled", "completed"):
        return False
    today = datetime.now(ZoneInfo("America/Bogota")).date()
    return event_date <= today <= end_date
