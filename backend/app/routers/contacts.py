from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.contact import Contact, ContactStatus, ContactType
from app.schemas.contact import ContactCreate, ContactRead, ContactUpdate

router = APIRouter(
    prefix="/api/contacts",
    tags=["contacts"],
    redirect_slashes=False,
    dependencies=[Depends(get_current_user)],
)


def _get(contact_id: int, db: Session) -> Contact:
    c = db.query(Contact).filter(Contact.id == contact_id).first()
    if not c:
        raise HTTPException(404, "Contacto no encontrado")
    return c


@router.get("", response_model=List[ContactRead])
def list_contacts(
    search: Optional[str] = Query(None),
    contact_type: Optional[ContactType] = Query(None),
    status: Optional[ContactStatus] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(Contact).order_by(Contact.full_name)
    if contact_type:
        q = q.filter(Contact.contact_type == contact_type)
    if status:
        q = q.filter(Contact.status == status)
    if search:
        like = f"%{search}%"
        q = q.filter(
            Contact.full_name.ilike(like) |
            Contact.location.ilike(like) |
            Contact.email.ilike(like) |
            Contact.instagram.ilike(like)
        )
    return q.all()


@router.post("", response_model=ContactRead, status_code=201)
def create_contact(body: ContactCreate, db: Session = Depends(get_db)):
    contact = Contact(**body.model_dump())
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


@router.get("/{contact_id}", response_model=ContactRead)
def get_contact(contact_id: int, db: Session = Depends(get_db)):
    return _get(contact_id, db)


@router.put("/{contact_id}", response_model=ContactRead)
def update_contact(contact_id: int, body: ContactUpdate, db: Session = Depends(get_db)):
    contact = _get(contact_id, db)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(contact, field, value)
    db.commit()
    db.refresh(contact)
    return contact


@router.delete("/{contact_id}", status_code=204)
def delete_contact(contact_id: int, db: Session = Depends(get_db)):
    contact = _get(contact_id, db)
    db.delete(contact)
    db.commit()


@router.patch("/{contact_id}/last-contacted", response_model=ContactRead)
def mark_last_contacted(contact_id: int, db: Session = Depends(get_db)):
    contact = _get(contact_id, db)
    contact.last_contacted_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(contact)
    return contact
