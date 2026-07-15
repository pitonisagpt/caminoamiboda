from datetime import date, datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from app.core.dependencies import require_admin
from app.database import get_db
from app.models.review import Review

router = APIRouter(prefix="/api/reviews", tags=["reviews"], redirect_slashes=False)


class ReviewRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    author_name: str
    rating: int
    body: str
    source: str
    vehicle_id: Optional[int] = None
    is_visible: bool
    event_date: Optional[date] = None
    created_at: datetime


class ReviewCreate(BaseModel):
    author_name: str
    rating: int
    body: str
    source: str = "manual"
    vehicle_id: Optional[int] = None
    is_visible: bool = True
    event_date: Optional[date] = None


class ReviewUpdate(BaseModel):
    author_name: Optional[str] = None
    rating: Optional[int] = None
    body: Optional[str] = None
    source: Optional[str] = None
    vehicle_id: Optional[int] = None
    is_visible: Optional[bool] = None
    event_date: Optional[date] = None


@router.get("", response_model=List[ReviewRead])
def list_reviews_public(
    vehicle_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(Review).filter(Review.is_visible == True)  # noqa: E712
    if vehicle_id:
        q = q.filter(Review.vehicle_id == vehicle_id)
    return q.order_by(Review.created_at.desc()).all()


@router.get("/admin", response_model=List[ReviewRead])
def list_reviews_admin(
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    return db.query(Review).order_by(Review.created_at.desc()).all()


@router.post("", response_model=ReviewRead, status_code=201)
def create_review(
    data: ReviewCreate,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    if not (1 <= data.rating <= 5):
        raise HTTPException(422, "Rating debe estar entre 1 y 5")
    review = Review(**data.model_dump())
    db.add(review)
    db.commit()
    db.refresh(review)
    return review


@router.put("/{review_id}", response_model=ReviewRead)
def update_review(
    review_id: int,
    data: ReviewUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    review = db.get(Review, review_id)
    if not review:
        raise HTTPException(404, "Opinión no encontrada")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(review, k, v)
    db.commit()
    db.refresh(review)
    return review


@router.patch("/{review_id}/toggle", response_model=ReviewRead)
def toggle_review_visibility(
    review_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    review = db.get(Review, review_id)
    if not review:
        raise HTTPException(404, "Opinión no encontrada")
    review.is_visible = not review.is_visible
    db.commit()
    db.refresh(review)
    return review


@router.delete("/{review_id}", status_code=204)
def delete_review(
    review_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    review = db.get(Review, review_id)
    if not review:
        raise HTTPException(404, "Opinión no encontrada")
    db.delete(review)
    db.commit()
