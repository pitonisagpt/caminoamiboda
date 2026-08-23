from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

# How many days before a query's start date to widen a SQL prefilter, so a
# multi-day event that started earlier but is still ongoing isn't missed by
# a naive event_date >= start comparison. The precise overlap check still
# happens afterwards via effective_end_date — this is just how far back the
# SQL query looks before that precise filter runs. Shared by conflicts.py,
# calendar.py, and anything else that range-filters Reservation.event_date.
MULTI_DAY_LOOKBACK_DAYS = 14


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
