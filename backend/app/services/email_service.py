from __future__ import annotations

import smtplib
from email.message import EmailMessage

from app.config import settings
from app.schemas.public_lead import PublicLeadCreate


def _ops_recipient() -> str:
    return settings.ops_notification_email or settings.company_email


def _smtp_configured() -> bool:
    return bool(settings.smtp_user and settings.smtp_password and _ops_recipient())


def send_new_lead_email(
    body: PublicLeadCreate,
    customer_id: int,
    reservation_id: int | None,
    is_new_customer: bool,
) -> None:
    """Best-effort notification to ops when a public lead comes in. Takes
    plain IDs rather than ORM objects — this runs as a BackgroundTask after
    the HTTP response is sent, by which point the request's DB session is
    closed, so touching an ORM object's attributes here could raise
    DetachedInstanceError. A failed send here must never surface to the
    visitor who submitted the form, so every failure is swallowed and
    logged, never raised."""
    if not _smtp_configured():
        return

    base = settings.frontend_url.rstrip("/")
    lines = [
        f"{'Cliente nuevo' if is_new_customer else 'Cliente existente'} — vía formulario web.",
        "",
        f"Nombre: {body.main_contact_name}",
        f"Teléfono: {body.phone}",
    ]
    if body.email:
        lines.append(f"Email: {body.email}")
    if body.wedding_date:
        lines.append(f"Fecha de boda: {body.wedding_date.isoformat()}")
    if body.found_via:
        lines.append(f"Cómo se enteró: {body.found_via}")
    if body.message:
        lines.append(f"Mensaje: {body.message}")
    lines.append("")
    lines.append(f"Ver cliente: {base}/clientes/editar/{customer_id}")
    if reservation_id:
        lines.append(f"Ver reserva: {base}/reservas/{reservation_id}")

    msg = EmailMessage()
    msg["Subject"] = f"Nuevo lead: {body.main_contact_name}"
    msg["From"] = settings.smtp_user
    msg["To"] = _ops_recipient()
    msg.set_content("\n".join(lines))

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
            server.starttls()
            server.login(settings.smtp_user, settings.smtp_password)
            server.send_message(msg)
    except Exception as e:
        print(f"⚠️  No se pudo enviar la notificación de lead por email: {e}")
