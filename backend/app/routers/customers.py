from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.customer import Customer
from app.models.reservation import Reservation
from app.schemas.customer import CustomerCreate, CustomerRead, CustomerUpdate, WhatsappTextResponse
from app.services.lead_messaging import build_lead_whatsapp_message

router = APIRouter(prefix="/api/customers", tags=["customers"], redirect_slashes=False, dependencies=[Depends(get_current_user)])


@router.get("", response_model=List[CustomerRead])
def list_customers(search: Optional[str] = Query(None), db: Session = Depends(get_db)):
    q = db.query(Customer).order_by(Customer.main_contact_name)
    if search:
        like = f"%{search}%"
        q = q.filter(
            Customer.main_contact_name.ilike(like)
            | Customer.bride_name.ilike(like)
            | Customer.groom_name.ilike(like)
            | Customer.phone.ilike(like)
            | Customer.email.ilike(like)
        )
    return q.all()


@router.post("", response_model=CustomerRead, status_code=201)
def create_customer(body: CustomerCreate, db: Session = Depends(get_db)):
    customer = Customer(**body.model_dump())
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


@router.get("/{customer_id}", response_model=CustomerRead)
def get_customer(customer_id: int, db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(404, "Cliente no encontrado")
    return customer


@router.get("/{customer_id}/whatsapp-text", response_model=WhatsappTextResponse)
def get_customer_whatsapp_text(customer_id: int, db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(404, "Cliente no encontrado")
    return WhatsappTextResponse(text=build_lead_whatsapp_message(customer))


@router.put("/{customer_id}", response_model=CustomerRead)
def update_customer(customer_id: int, body: CustomerUpdate, db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(404, "Cliente no encontrado")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(customer, field, value)
    db.commit()
    db.refresh(customer)
    # Every reservation's EventTimeline caches this customer's name/phone as
    # main_contact_name/main_contact_phone (so the Evento tab and Google
    # Calendar sync don't need a live join) — but that cache was only ever
    # refreshed from reservations.py's own update endpoint, never from here.
    # A phone/name fixed on the customer directly (the natural place to do
    # it) would silently never reach an already-created timeline otherwise.
    from app.routers.reservations import _sync_linked_timelines
    for r in db.query(Reservation).filter(Reservation.customer_id == customer_id).all():
        _sync_linked_timelines(r, db)
    return customer


@router.delete("/{customer_id}", status_code=204)
def delete_customer(customer_id: int, db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(404, "Cliente no encontrado")
    db.delete(customer)
    db.commit()
