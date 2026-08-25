"""WhatsApp follow-up copy for quoted-but-not-yet-booked reservations.

Six templates, escalating as the event date approaches. Generic "evento"
language on purpose — this app also handles quinceañeras, activaciones de
marca and producciones audiovisuales, not just weddings, and event_type
(which lives on EventTimeline) usually doesn't exist yet at 'quoted' status.

No emojis in any of these templates — emojis in the U+1F000+ range corrupt to
"?" boxes when passed through encodeURIComponent for wa.me links (same
caveat as backend/app/services/lead_messaging.py).
"""
from dataclasses import dataclass
from datetime import date
from typing import Optional


def _first_name(full_name: str | None) -> str:
    return (full_name or "").split(" ")[0] or "Hola"


def _format_date_es(d: date) -> str:
    months = [
        "enero", "febrero", "marzo", "abril", "mayo", "junio",
        "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
    ]
    return f"{d.day} de {months[d.month - 1]} de {d.year}"


@dataclass
class FollowUpTemplate:
    key: str
    label: str
    # Recommended window in days-to-event. None on either side = unbounded.
    min_days: Optional[int]
    max_days: Optional[int]
    build: "callable"


def _tpl1(name: str, date_str: str, vehicle: str) -> str:
    return (
        f"Hola {name}, ¿alcanzaste a ver la cotización que te enviamos para tu evento del {date_str}? "
        f"Cualquier duda con gusto te ayudo — vehículo, ruta, disponibilidad, lo que necesites."
    )


def _tpl2(name: str, date_str: str, vehicle: str) -> str:
    return (
        f"Hola {name}, te cuento que el {vehicle} que cotizamos ha estado en varios eventos últimamente "
        f"— te comparto nuestro Instagram para que lo veas en acción: https://www.instagram.com/caminoamiboda. "
        f"¿Seguimos con la reserva?"
    )


def _tpl3(name: str, date_str: str, vehicle: str) -> str:
    return (
        f"Hola {name}, para la fecha de tu evento ({date_str}) ya estamos recibiendo bastantes solicitudes. "
        f"Si quieres asegurar el {vehicle}, te recomiendo confirmar pronto para garantizar la fecha."
    )


def _tpl4(name: str, date_str: str, vehicle: str) -> str:
    return (
        f"Hola {name}, ¿cómo vas con la planeación? Si el tema es el pago, recuerda que solo necesitas "
        f"un abono para reservar la fecha y el resto lo defines después. Cuéntame si tienes dudas."
    )


def _tpl5(name: str, date_str: str, vehicle: str) -> str:
    return (
        f"Hola {name}, tu evento ya está cerca ({date_str}) y quiero asegurarme de que tengas tu transporte "
        f"listo. Si aún no has confirmado el {vehicle}, avísame pronto — ya quedan pocos cupos para esa fecha."
    )


def _tpl6(name: str, date_str: str, vehicle: str) -> str:
    return (
        f"Hola {name}, tu evento es en pocos días ({date_str}) y aún no hemos confirmado el vehículo. "
        f"Si todavía te interesa, escríbeme hoy mismo para organizarlo a tiempo."
    )


TEMPLATES: list[FollowUpTemplate] = [
    FollowUpTemplate("1", "Seguimiento inicial", None, None, _tpl1),
    FollowUpTemplate("2", "Mostrar el vehículo en acción", 60, None, _tpl2),
    FollowUpTemplate("3", "Urgencia de disponibilidad", 30, 60, _tpl3),
    FollowUpTemplate("4", "Resolver objeciones de pago", 15, 30, _tpl4),
    FollowUpTemplate("5", "Últimas fechas disponibles", 7, 15, _tpl5),
    FollowUpTemplate("6", "Mensaje final", 0, 7, _tpl6),
]
TEMPLATE_BY_KEY = {t.key: t for t in TEMPLATES}


def window_label(t: FollowUpTemplate) -> str:
    if t.min_days is None and t.max_days is None:
        return "en cualquier momento"
    if t.max_days is None:
        return f"más de {t.min_days} días antes"
    if t.min_days == 0:
        return f"menos de {t.max_days} días antes"
    return f"entre {t.min_days} y {t.max_days} días antes"


def window_status(t: FollowUpTemplate, days_to_event: int) -> str:
    """'a_tiempo' | 'temprano' | 'atrasado' — purely informational, doesn't gate anything."""
    if t.min_days is None and t.max_days is None:
        return "a_tiempo"
    if t.max_days is not None and days_to_event > t.max_days:
        return "temprano"
    if t.min_days is not None and days_to_event < t.min_days:
        return "atrasado"
    return "a_tiempo"


def build_message(template_key: str, reservation) -> str:
    t = TEMPLATE_BY_KEY[template_key]
    name = _first_name(reservation.display_customer if reservation.display_customer != "—" else None)
    date_str = _format_date_es(reservation.event_date) if reservation.event_date else "la fecha de tu evento"
    vehicle = reservation.display_vehicle if reservation.display_vehicle != "—" else "el vehículo"
    return t.build(name, date_str, vehicle)
