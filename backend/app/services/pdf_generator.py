import io
from datetime import date, datetime
from pathlib import Path

from jinja2 import Environment, FileSystemLoader

try:
    from weasyprint import HTML as WeasyHTML
    _USE_WEASYPRINT = True
except Exception:
    _USE_WEASYPRINT = False

from app.models.billing_document import BillingDocument, DocumentType

MONTHS_ES = {
    1: "enero", 2: "febrero", 3: "marzo", 4: "abril",
    5: "mayo", 6: "junio", 7: "julio", 8: "agosto",
    9: "septiembre", 10: "octubre", 11: "noviembre", 12: "diciembre",
}

TEMPLATE_DIR = Path(__file__).parent.parent.parent / "templates"


def _format_date_es(d: date) -> str:
    return f"{d.day} de {MONTHS_ES[d.month]} de {d.year}"


def _format_cop(amount) -> str:
    return f"COP ${int(amount):,}".replace(",", ".")


def _amount_in_words(amount: float) -> str:
    """Very basic number-to-words for COP amounts (whole thousands only)."""
    try:
        from num2words import num2words
        return num2words(int(amount), lang="es") + " pesos"
    except ImportError:
        return f"{int(amount):,} pesos".replace(",", ".")


def generate_pdf(doc: BillingDocument, settings) -> str:
    env = Environment(loader=FileSystemLoader(str(TEMPLATE_DIR)), autoescape=True)

    template_name = (
        "pdf_formal.html" if doc.document_type == DocumentType.formal else "pdf_letter.html"
    )
    template = env.get_template(template_name)

    route_stops = []
    if doc.route:
        route_stops = [line.strip() for line in doc.route.splitlines() if line.strip()]

    context = {
        "doc": doc,
        "document_number": doc.document_number,
        "formatted_date": _format_date_es(datetime.now().date()),
        "formatted_today": _format_date_es(datetime.now().date()),
        "formatted_service_date": _format_date_es(doc.service_date),
        "formatted_amount": _format_cop(doc.total_amount),
        "amount_in_words": _amount_in_words(float(doc.total_amount)),
        "route_stops": route_stops,
        "company_name": settings.company_name,
        "company_owner": settings.company_owner,
        "company_phone": settings.company_phone,
        "company_cc": settings.company_cc,
        "bank_name": settings.bank_name,
        "bank_account": settings.bank_account,
        "city": settings.city,
    }

    html_content = template.render(**context)

    output_dir = Path(settings.pdf_storage_path)
    output_dir.mkdir(parents=True, exist_ok=True)
    pdf_path = output_dir / f"{doc.document_number}.pdf"

    if _USE_WEASYPRINT:
        WeasyHTML(string=html_content, base_url=str(TEMPLATE_DIR)).write_pdf(str(pdf_path))
    else:
        from xhtml2pdf import pisa
        with open(str(pdf_path), "wb") as f:
            result = pisa.CreatePDF(io.StringIO(html_content), dest=f)
            if result.err:
                raise RuntimeError(f"Error al generar PDF: {result.err}")

    return str(pdf_path)
