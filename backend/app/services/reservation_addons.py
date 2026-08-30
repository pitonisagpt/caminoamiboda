from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.reservation_addon import ReservationAddon


def get_reservation_addons(reservation_id: int, db: Session) -> list[ReservationAddon]:
    """The reservation's additional-service rows, in display order. Always
    query this directly rather than via any ORM collection relationship on
    Reservation — see ReservationAddon's docstring for why."""
    return (
        db.query(ReservationAddon)
        .filter(ReservationAddon.reservation_id == reservation_id)
        .order_by(ReservationAddon.display_order)
        .all()
    )


def addon_company_amount(addon: ReservationAddon) -> Decimal:
    return (addon.price * Decimal(addon.company_percentage) / Decimal(100)).quantize(Decimal("0.01"))


def addon_provider_amount(addon: ReservationAddon) -> Decimal:
    return addon.price - addon_company_amount(addon)


def reservation_addons_total(reservation_id: int, db: Session) -> Decimal:
    """Sum of all addon prices for a reservation — the amount that must be
    excluded from the vehicle-owner settlement's base value, since these
    services belong to a third-party provider, not the vehicle owner."""
    return sum(
        (a.price for a in get_reservation_addons(reservation_id, db)),
        Decimal("0"),
    )
