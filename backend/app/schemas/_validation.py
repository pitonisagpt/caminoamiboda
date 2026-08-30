"""Shared field-level validators for write schemas (Create/Update).

Not an API schema itself (hence the leading underscore) — never import
this into a Read/List/Public response schema. Those must stay unable to
fail on data that's already sitting in the database (a legacy or
otherwise-dirty value must be readable, even if it would be rejected on a
fresh write) — see customer.py/driver.py/billing_document.py for the
Fields/Base split that keeps validation write-only.
"""
import re
import unicodedata
from typing import Optional


def validate_phone_or_none(v: Optional[str]) -> Optional[str]:
    if v is None:
        return v
    # Strip invisible Unicode format marks (e.g. the LRM/RLM direction marks
    # iOS/WhatsApp wrap around a phone number when you copy it as a detected
    # link) and fold odd whitespace variants (NBSP, etc.) into regular spaces,
    # so a pasted number isn't rejected just because of formatting noise.
    stripped = "".join(ch for ch in v if unicodedata.category(ch) != "Cf")
    normalized = re.sub(r"\s+", " ", unicodedata.normalize("NFKC", stripped)).strip()
    if normalized == "":
        return normalized
    digit_count = len(re.sub(r"\D", "", normalized))
    if digit_count < 7 or digit_count > 15:
        raise ValueError("Número de teléfono inválido")
    return normalized
