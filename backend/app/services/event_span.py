from datetime import date, timedelta


def max_day_number(activities) -> int:
    """Highest day_number across a timeline's activities (1 if none/absent)."""
    return max((getattr(a, "day_number", 1) or 1 for a in (activities or [])), default=1)


def effective_end_date(event_date: date, activities) -> date:
    """Last calendar date actually occupied by an event, given its activities' day_number."""
    return event_date + timedelta(days=max_day_number(activities) - 1)
