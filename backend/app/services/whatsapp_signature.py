"""Shared closing signature for substantive outbound WhatsApp messages the
company sends (quotes, follow-ups, lead outreach) — not for one-line pings.
Mirrors frontend/src/utils/whatsapp.ts's WHATSAPP_SIGNATURE; keep both in
sync if this text ever changes.
"""

WHATSAPP_SIGNATURE = (
    "Camino a mi Boda\n"
    "Instagram: https://www.instagram.com/caminoamiboda\n"
    "Web: https://caminoamiboda.com"
)


def append_signature(text: str) -> str:
    return f"{text}\n\n{WHATSAPP_SIGNATURE}"
