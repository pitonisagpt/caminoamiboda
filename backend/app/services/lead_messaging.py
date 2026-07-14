"""WhatsApp follow-up copy for leads (e.g. from wedding fairs).

No emojis in any of these templates — emojis in the U+1F000+ range corrupt to
"?" boxes when passed through encodeURIComponent for wa.me links.
"""
from datetime import date


def _first_name(full_name: str | None) -> str:
    return (full_name or "").split(" ")[0] or "Hola"


def _format_date_es(d: date) -> str:
    months = [
        "enero", "febrero", "marzo", "abril", "mayo", "junio",
        "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
    ]
    return f"{d.day} de {months[d.month - 1]} de {d.year}"


def build_lead_whatsapp_message(customer) -> str:
    name = _first_name(customer.bride_name or customer.main_contact_name)
    date_str = _format_date_es(customer.wedding_date) if customer.wedding_date else "tu fecha"

    if customer.lead_temperature == "caliente":
        return (
            f"Hola {name}, ¿cómo estás?\n\n"
            f"Te escribo de Camino a mi Boda. Ya tienes nuestro portafolio, y quería avisarte "
            f"que se nos está llenando la agenda para {date_str}. Queremos sostenerte la hora "
            f"adicional de regalo que hablamos en la Feria Vizcaya (5 horas de servicio por el "
            f"precio de 4) para que puedas congelar tu fecha antes de que se libere el cupo.\n\n"
            f"¿Te gustaría que te reserve el espacio?"
        )

    return (
        f"Hola {name}, ¿cómo estás?\n\n"
        f"Te escribo de Camino a mi Boda, el carro clásico/vintage para bodas. Nos conocimos en "
        f"la Feria Vizcaya del 9 de mayo. Como cortesía por haber pasado por nuestro stand, "
        f"activamos para tu fecha ({date_str}) una hora adicional de regalo: 5 horas de servicio "
        f"por el precio de 4, para que tengas tranquilidad frente a cualquier retraso del día.\n\n"
        f"¿Te imaginas el carro convertible o cerrado para tu boda?"
    )
