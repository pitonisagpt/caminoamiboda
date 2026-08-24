import io
import os
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from jinja2 import Environment, FileSystemLoader
from sqlalchemy.orm import Session

from app.config import settings
from app.core.dependencies import require_admin
from app.core.files import safe_pdf_path
from app.database import get_db
from app.models.vehicle_owner import VehicleOwner
from app.models.vehicle_owner_contract import VehicleOwnerContract
from app.schemas.vehicle_owner_contract import VehicleOwnerContractRead

router = APIRouter(
    prefix="/api/vehicle-owners",
    tags=["vehicle-owner-contracts"],
    dependencies=[Depends(require_admin)],
    redirect_slashes=False,
)

MONTHS_ES = {
    1: "enero", 2: "febrero", 3: "marzo", 4: "abril",
    5: "mayo", 6: "junio", 7: "julio", 8: "agosto",
    9: "septiembre", 10: "octubre", 11: "noviembre", 12: "diciembre",
}
TEMPLATE_DIR = Path(__file__).parent.parent.parent / "templates"


def _format_date_es(d) -> str:
    if d is None:
        return ""
    return f"{d.day} de {MONTHS_ES[d.month]} de {d.year}"


def _next_contract_number(db: Session) -> str:
    now = datetime.now()
    prefix = f"CONT-{now.year}-"
    last = (
        db.query(VehicleOwnerContract)
        .filter(VehicleOwnerContract.contract_number.like(f"{prefix}%"))
        .order_by(VehicleOwnerContract.contract_number.desc())
        .first()
    )
    seq = int(last.contract_number.split("-")[-1]) + 1 if last else 1
    return f"{prefix}{seq:03d}"


def _get_owner(owner_id: int, db: Session) -> VehicleOwner:
    owner = db.query(VehicleOwner).filter(VehicleOwner.id == owner_id).first()
    if not owner:
        raise HTTPException(status_code=404, detail="Propietario no encontrado")
    return owner


def _get_contract(owner_id: int, db: Session) -> VehicleOwnerContract:
    contract = db.query(VehicleOwnerContract).filter(VehicleOwnerContract.owner_id == owner_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contrato no generado aún")
    return contract


@router.get("/{owner_id}/contract", response_model=VehicleOwnerContractRead)
def get_contract(owner_id: int, db: Session = Depends(get_db)):
    _get_owner(owner_id, db)
    return VehicleOwnerContractRead.model_validate(_get_contract(owner_id, db))


@router.post("/{owner_id}/contract/generate-pdf", response_model=VehicleOwnerContractRead)
def generate_contract_pdf(owner_id: int, db: Session = Depends(get_db)):
    owner = _get_owner(owner_id, db)

    contract = db.query(VehicleOwnerContract).filter(VehicleOwnerContract.owner_id == owner_id).first()
    if not contract:
        contract = VehicleOwnerContract(owner_id=owner_id, contract_number=_next_contract_number(db))
        db.add(contract)
        db.commit()
        db.refresh(contract)

    env = Environment(loader=FileSystemLoader(str(TEMPLATE_DIR)), autoescape=True)
    template = env.get_template("contrato_marco.html")

    html = template.render(
        contract=contract,
        owner=owner,
        formatted_date=_format_date_es(datetime.now(ZoneInfo("America/Bogota")).date()),
        company_name=settings.company_name,
        company_owner=settings.company_owner,
        company_phone=settings.company_phone,
        company_cc=settings.company_cc,
        company_cc_city=settings.company_cc_city,
        company_ciiu=settings.company_ciiu,
        company_address=settings.company_address,
        company_email=settings.company_email,
        city=settings.city,
    )

    output_dir = Path(settings.pdf_storage_path) / "owner_contracts"
    output_dir.mkdir(parents=True, exist_ok=True)
    pdf_path = output_dir / f"{contract.contract_number}.pdf"

    try:
        from weasyprint import HTML as WeasyHTML
        WeasyHTML(string=html, base_url=str(TEMPLATE_DIR)).write_pdf(str(pdf_path))
    except Exception:
        from xhtml2pdf import pisa
        with open(str(pdf_path), "wb") as f:
            pisa.CreatePDF(io.StringIO(html), dest=f)

    contract.pdf_path = str(pdf_path)
    db.commit()
    db.refresh(contract)
    return VehicleOwnerContractRead.model_validate(contract)


@router.get("/{owner_id}/contract/pdf")
def download_contract_pdf(owner_id: int, db: Session = Depends(get_db)):
    _get_owner(owner_id, db)
    contract = _get_contract(owner_id, db)
    if not contract.pdf_path or not os.path.exists(contract.pdf_path):
        raise HTTPException(404, "PDF no generado aún")
    pdf = safe_pdf_path(contract.pdf_path, Path(settings.pdf_storage_path))
    return FileResponse(
        path=str(pdf),
        media_type="application/pdf",
        filename=f"{contract.contract_number}.pdf",
        headers={"Cache-Control": "no-store"},
    )
