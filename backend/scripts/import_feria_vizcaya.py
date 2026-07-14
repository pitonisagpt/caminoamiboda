"""Import wedding-fair leads from the Feria Vizcaya (9 mayo) spreadsheet.

Source: docs/eventos/Ruta de Novias Vizcaya - BASE DATOS CONSOLIDADO. 9 MAYO.xlsx
Idempotent upsert by phone (falls back to email) — safe to re-run.

Usage:
    python scripts/import_feria_vizcaya.py [--dry-run]
"""
import re
import sys
from datetime import date, datetime

sys.path.insert(0, "/app")

import app.models.contact          # noqa
import app.models.customer         # noqa
import app.models.driver           # noqa
import app.models.vehicle          # noqa
import app.models.vehicle_photo    # noqa
import app.models.vehicle_owner    # noqa
import app.models.quote            # noqa
import app.models.reservation      # noqa
import app.models.reservation_payment  # noqa
import app.models.event_timeline   # noqa
import app.models.event_location   # noqa
import app.models.timeline_activity  # noqa
import app.models.billing_document  # noqa
import app.models.owner_settlement  # noqa
import app.models.owner_settlement_payment  # noqa

import openpyxl

from app.database import SessionLocal
from app.models.customer import Customer
from app.models.quote import Quote
from app.services.lead_messaging import build_lead_whatsapp_message

DRY_RUN = "--dry-run" in sys.argv

SOURCE_XLSX = "docs/eventos/Ruta de Novias Vizcaya - BASE DATOS CONSOLIDADO. 9 MAYO.xlsx"
SHEET_NAME = "RDNV 2026"
REFERRAL_SOURCE = "Feria Vizcaya Mayo"
FAIR_NOTE = "Asistió a Feria Vizcaya Mayo (9 mayo 2026)."
TODAY = date(2026, 7, 14)


# ── Normalizers ─────────────────────────────────────────────────────────────────

def _normalize_phone(raw) -> str | None:
    if raw is None:
        return None
    s = str(raw).strip()
    if not s or s.upper() in ("N/A", "NA"):
        return None
    digits = re.sub(r"\D", "", s)
    if len(digits) < 7:
        return None
    last10 = digits[-10:] if len(digits) >= 10 else digits
    return f"+57{last10}"


def _normalize_email(raw) -> str | None:
    if raw is None:
        return None
    s = str(raw).strip().lower()
    return s or None


def _normalize_name(raw) -> str | None:
    if raw is None:
        return None
    s = re.sub(r"\s+", " ", str(raw)).strip()
    return s or None


_MONTHS_ES = {
    "enero": 1, "ene": 1,
    "febrero": 2, "feb": 2,
    "marzo": 3, "mar": 3,
    "abril": 4, "abr": 4,
    "mayo": 5,
    "junio": 6, "jun": 6,
    "julio": 7, "jul": 7,
    "agosto": 8, "ago": 8,
    "septiembre": 9, "setiembre": 9, "sept": 9, "sep": 9,
    "octubre": 10, "oct": 10,
    "noviembre": 11, "nov": 11,
    "diciembre": 12, "dic": 12,
}


def _parse_text_month_date(s: str) -> tuple[int | None, int, int | None] | None:
    """Parse free-text Spanish dates like '12 de septiembre', 'Febrero 6 de 2027',
    'Agosto 2026', 'Junio'. Returns (day_or_None, month, year_or_None), or None if
    no recognizable month name is found at all."""
    low = s.lower()
    month = None
    month_word = None
    for name, num in _MONTHS_ES.items():
        if re.search(rf"\b{name}\b", low):
            month, month_word = num, name
            break
    if month is None:
        return None

    year_match = re.search(r"\b(20\d{2})\b", low)
    year = int(year_match.group(1)) if year_match else None

    remainder = low.replace(month_word, " ")
    if year_match:
        remainder = remainder.replace(year_match.group(1), " ")
    day_match = re.search(r"\b(\d{1,2})\b", remainder)
    day = int(day_match.group(1)) if day_match else None
    if day is not None and not (1 <= day <= 31):
        day = None

    return (day, month, year)


def _parse_wedding_date(raw, warnings: list, row_label: str) -> tuple[date | None, date | None]:
    """Returns (wedding_date, status_ref_date).

    wedding_date: only set when day+month+year are all genuinely known — never a
    fabricated day, since it's shown to ops as a real date elsewhere in the app.
    status_ref_date: best-effort date used only to decide activo/archivado; falls
    back to day=1 when the day is unknown, and to the nearest *future* occurrence
    of the month when the year is unknown (every lead here is from a fair, so an
    unqualified month name almost always means the next upcoming one).
    """
    if raw is None or raw == "":
        return None, None
    if isinstance(raw, datetime):
        return raw.date(), raw.date()
    if isinstance(raw, date):
        return raw, raw
    if isinstance(raw, int):
        warnings.append(f"{row_label}: fecha incompleta (solo '{raw}', falta día/mes) — se deja sin fecha")
        return None, None

    s = str(raw).strip()
    parts = re.split(r"[/\-.]", s)

    if len(parts) == 2 and all(p.isdigit() for p in parts):
        # "MM/YYYY" — month + year, no day.
        m, y = int(parts[0]), int(parts[1])
        if 1 <= m <= 12 and y >= 1000:
            warnings.append(f"{row_label}: fecha aproximada ('{s}' -> {m}/{y}, sin día exacto) — wedding_date queda vacío, solo se usa para activo/archivado")
            try:
                return None, date(y, m, 1)
            except ValueError:
                return None, None

    if len(parts) == 3:
        try:
            a, b, y = (int(p) for p in parts)
        except ValueError:
            a = b = y = None
        if a is not None:
            if y < 100:
                y += 2000
            elif 100 <= y < 1000:
                warnings.append(f"{row_label}: año inválido ('{s}', año={y}) — se deja sin fecha, revisar manualmente")
                return None, None

            if a > 12 and b > 12:
                warnings.append(f"{row_label}: fecha ambigua/inválida ('{s}') — se deja sin fecha")
                return None, None
            # Day/month order is inconsistent across the file (mix of M/D/Y and
            # D/M/Y). Whichever component is >12 must be the day. If both are
            # <=12 (fully ambiguous), default to D/M/Y (Colombian convention).
            if a > 12:
                day, month = a, b
            elif b > 12:
                day, month = b, a
            else:
                day, month = a, b
            try:
                d = date(y, month, day)
                return d, d
            except ValueError:
                warnings.append(f"{row_label}: fecha inválida ('{s}') — se deja sin fecha")
                return None, None

    parsed = _parse_text_month_date(s)
    if parsed is None:
        warnings.append(f"{row_label}: formato de fecha irreconocible ('{s}') — se deja sin fecha")
        return None, None

    day, month, year = parsed
    if year is None:
        probe_day = day or 1
        year = TODAY.year
        try:
            candidate = date(year, month, probe_day)
        except ValueError:
            candidate = date(year, month, 1)
        if candidate < TODAY:
            year += 1

    if day is None:
        try:
            status_ref = date(year, month, 1)
        except ValueError:
            status_ref = None
        warnings.append(f"{row_label}: fecha aproximada ('{s}' -> {month}/{year}, sin día exacto) — wedding_date queda vacío, solo se usa para activo/archivado")
        return None, status_ref

    try:
        d = date(year, month, day)
    except ValueError:
        warnings.append(f"{row_label}: fecha inválida ('{s}') — se deja sin fecha")
        return None, None
    return d, d


def main():
    wb = openpyxl.load_workbook(SOURCE_XLSX, data_only=True)
    ws = wb[SHEET_NAME]
    rows = list(ws.iter_rows(min_row=2, values_only=True))

    db = SessionLocal()

    customers_by_phone: dict[str, Customer] = {}
    customers_by_email: dict[str, Customer] = {}
    for c in db.query(Customer).all():
        if c.phone:
            customers_by_phone.setdefault(c.phone, c)
        if c.whatsapp:
            customers_by_phone.setdefault(c.whatsapp, c)
        if c.email:
            customers_by_email.setdefault(c.email.lower(), c)

    hot_phones: set[str] = set()
    for (phone,) in db.query(Quote.customer_phone).filter(Quote.status != "draft").all():
        norm = _normalize_phone(phone)
        if norm:
            hot_phones.add(norm)

    date_warnings: list[str] = []
    new_count = 0
    updated_count = 0
    status_counts = {"activo": 0, "archivado": 0}
    temp_counts = {"frio": 0, "caliente": 0}
    sample_frio = None
    sample_caliente = None
    skipped_empty = 0

    for idx, row in enumerate(rows, start=2):
        novia_raw, novio_raw, email_raw, phone_raw, fecha_raw = row
        if not novia_raw and not novio_raw and not email_raw and not phone_raw:
            skipped_empty += 1
            continue

        bride_name = _normalize_name(novia_raw)
        groom_name = _normalize_name(novio_raw)
        main_contact_name = bride_name or groom_name or "Sin nombre (Feria Vizcaya)"
        row_label = f"fila {idx} ({main_contact_name})"

        phone = _normalize_phone(phone_raw)
        email = _normalize_email(email_raw)
        wedding_date, status_ref_date = _parse_wedding_date(fecha_raw, date_warnings, row_label)

        existing = None
        if phone and phone in customers_by_phone:
            existing = customers_by_phone[phone]
        elif email and email in customers_by_email:
            existing = customers_by_email[email]

        temperature = "caliente" if (phone and phone in hot_phones) else "frio"
        lead_status = "archivado" if (status_ref_date and status_ref_date < TODAY) else "activo"
        aplica_hora_regalo = lead_status == "activo"

        if existing:
            existing.lead_temperature = temperature
            existing.lead_status = lead_status
            existing.aplica_hora_regalo = aplica_hora_regalo
            if not existing.notes:
                existing.notes = FAIR_NOTE
            elif FAIR_NOTE not in existing.notes:
                existing.notes = f"{existing.notes}\n{FAIR_NOTE}"
            if not existing.referral_source:
                existing.referral_source = REFERRAL_SOURCE
            if not existing.wedding_date and wedding_date:
                existing.wedding_date = wedding_date
            customer = existing
            updated_count += 1
        else:
            customer = Customer(
                bride_name=bride_name,
                groom_name=groom_name,
                main_contact_name=main_contact_name,
                phone=phone,
                email=email,
                wedding_date=wedding_date,
                referral_source=REFERRAL_SOURCE,
                lead_status=lead_status,
                lead_temperature=temperature,
                aplica_hora_regalo=aplica_hora_regalo,
                notes=FAIR_NOTE,
            )
            db.add(customer)
            if phone:
                customers_by_phone.setdefault(phone, customer)
            if email:
                customers_by_email.setdefault(email, customer)
            new_count += 1

        status_counts[lead_status] += 1
        temp_counts[temperature] += 1
        if temperature == "frio" and sample_frio is None:
            sample_frio = customer
        if temperature == "caliente" and sample_caliente is None:
            sample_caliente = customer

    db.flush()

    print("=" * 70)
    print(f"Filas leídas: {len(rows)} | vacías omitidas: {skipped_empty}")
    print(f"Nuevos clientes: {new_count} | actualizados (ya existían): {updated_count}")
    print(f"Estado -> activo: {status_counts['activo']} | archivado: {status_counts['archivado']}")
    print(f"Temperatura -> frío: {temp_counts['frio']} | caliente: {temp_counts['caliente']}")
    approx = [w for w in date_warnings if "aproximada" in w]
    unusable = [w for w in date_warnings if "aproximada" not in w]
    print(f"Fechas aproximadas (mes/año sin día exacto — sí cuentan para activo/archivado): {len(approx)}")
    print(f"Fechas totalmente irreconocibles (revisión manual, quedan como 'activo' por defecto): {len(unusable)}")
    if unusable:
        print("-" * 70)
        for w in unusable:
            print(" -", w)
    print("=" * 70)

    if sample_frio:
        print("\n--- Ejemplo de mensaje (FRÍO) ---")
        print(build_lead_whatsapp_message(sample_frio))
    if sample_caliente:
        print("\n--- Ejemplo de mensaje (CALIENTE) ---")
        print(build_lead_whatsapp_message(sample_caliente))

    if DRY_RUN:
        db.rollback()
        print("\n[DRY RUN] No se guardó nada. Corre sin --dry-run para aplicar.")
    else:
        db.commit()
        print("\nCambios guardados.")


if __name__ == "__main__":
    main()
