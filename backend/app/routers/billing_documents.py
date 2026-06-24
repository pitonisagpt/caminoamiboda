import os
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy import extract, func
from sqlalchemy.orm import Session

from app.config import settings
from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.billing_document import BillingDocument, DocumentStatus, DocumentType
from app.models.user import User
from app.schemas.billing_document import (
    BillingDocumentCreate,
    BillingDocumentList,
    BillingDocumentRead,
    BillingDocumentUpdate,
    PdfResponse,
)
from app.services.pdf_generator import generate_pdf

router = APIRouter(
    prefix="/api/billing-documents",
    tags=["billing-documents"],
    dependencies=[Depends(get_current_user)],
)


def _next_document_number(db: Session) -> str:
    year = date.today().year
    count = (
        db.query(func.count(BillingDocument.id))
        .filter(extract("year", BillingDocument.created_at) == year)
        .scalar()
        or 0
    )
    return f"CDC-{year}-{count + 1:03d}"


@router.get("", response_model=list[BillingDocumentList])
def list_billing_documents(
    status: Optional[DocumentStatus] = Query(None),
    document_type: Optional[DocumentType] = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(BillingDocument).order_by(BillingDocument.created_at.desc())
    if status:
        query = query.filter(BillingDocument.status == status)
    if document_type:
        query = query.filter(BillingDocument.document_type == document_type)
    return query.all()


@router.post("", response_model=BillingDocumentRead, status_code=201)
def create_billing_document(payload: BillingDocumentCreate, db: Session = Depends(get_db)):
    doc = BillingDocument(
        **payload.model_dump(),
        document_number=_next_document_number(db),
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


@router.get("/{doc_id}", response_model=BillingDocumentRead)
def get_billing_document(doc_id: int, db: Session = Depends(get_db)):
    doc = db.get(BillingDocument, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    return doc


@router.put("/{doc_id}", response_model=BillingDocumentRead)
def update_billing_document(
    doc_id: int, payload: BillingDocumentUpdate, db: Session = Depends(get_db)
):
    doc = db.get(BillingDocument, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(doc, field, value)
    db.commit()
    db.refresh(doc)
    return doc


@router.delete("/{doc_id}", status_code=204)
def delete_billing_document(doc_id: int, db: Session = Depends(get_db)):
    doc = db.get(BillingDocument, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    if doc.status != DocumentStatus.draft:
        raise HTTPException(
            status_code=400,
            detail="Solo se pueden eliminar documentos en estado borrador",
        )
    db.delete(doc)
    db.commit()


@router.post("/{doc_id}/generate-pdf", response_model=PdfResponse)
def generate_document_pdf(doc_id: int, db: Session = Depends(get_db)):
    doc = db.get(BillingDocument, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")

    pdf_path = generate_pdf(doc, settings)
    doc.pdf_path = pdf_path
    db.commit()

    return PdfResponse(
        document_number=doc.document_number,
        pdf_url=f"/api/billing-documents/{doc_id}/pdf",
    )


@router.get("/{doc_id}/pdf")
def download_pdf(doc_id: int, db: Session = Depends(get_db)):
    doc = db.get(BillingDocument, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    if not doc.pdf_path or not os.path.exists(doc.pdf_path):
        raise HTTPException(status_code=404, detail="PDF no generado aún")

    return FileResponse(
        path=doc.pdf_path,
        media_type="application/pdf",
        filename=f"{doc.document_number}.pdf",
    )
