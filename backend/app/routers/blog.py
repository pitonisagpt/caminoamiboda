import re
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.blog_post import BlogPost
from app.schemas.blog_post import BlogPostCreate, BlogPostRead, BlogPostUpdate

router = APIRouter(prefix="/api/blog", tags=["blog"], redirect_slashes=False)


def _slugify(text: str) -> str:
    s = text.lower().strip()
    s = re.sub(r'[áàä]', 'a', s)
    s = re.sub(r'[éèë]', 'e', s)
    s = re.sub(r'[íìï]', 'i', s)
    s = re.sub(r'[óòö]', 'o', s)
    s = re.sub(r'[úùü]', 'u', s)
    s = re.sub(r'ñ', 'n', s)
    s = re.sub(r'[^a-z0-9\s-]', '', s)
    s = re.sub(r'[\s-]+', '-', s)
    return s.strip('-')


def _get_or_404(post_id: int, db: Session) -> BlogPost:
    post = db.get(BlogPost, post_id)
    if not post:
        raise HTTPException(404, "Artículo no encontrado")
    return post


@router.get("", response_model=List[BlogPostRead])
def list_posts(
    published_only: bool = Query(False),
    db: Session = Depends(get_db),
):
    q = db.query(BlogPost)
    if published_only:
        q = q.filter(BlogPost.published == True).order_by(BlogPost.published_at.desc())  # noqa: E712
    else:
        q = q.order_by(BlogPost.created_at.desc())
    return q.all()


@router.get("/{slug}", response_model=BlogPostRead)
def get_post(slug: str, db: Session = Depends(get_db)):
    post = db.query(BlogPost).filter(BlogPost.slug == slug).first()
    if not post:
        raise HTTPException(404, "Artículo no encontrado")
    return post


@router.post("", response_model=BlogPostRead, status_code=201, dependencies=[Depends(get_current_user)])
def create_post(data: BlogPostCreate, db: Session = Depends(get_db)):
    slug = data.slug or _slugify(data.title)
    if db.query(BlogPost).filter(BlogPost.slug == slug).first():
        raise HTTPException(400, f"Slug '{slug}' ya existe")
    post = BlogPost(**data.model_dump(exclude={'slug'}), slug=slug)
    if post.published and not post.published_at:
        post.published_at = datetime.now(timezone.utc)
    db.add(post)
    db.commit()
    db.refresh(post)
    return post


@router.put("/{post_id}", response_model=BlogPostRead, dependencies=[Depends(get_current_user)])
def update_post(post_id: int, data: BlogPostUpdate, db: Session = Depends(get_db)):
    post = _get_or_404(post_id, db)
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(post, k, v)
    if post.published and not post.published_at:
        post.published_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(post)
    return post


@router.patch("/{post_id}/publish", response_model=BlogPostRead, dependencies=[Depends(get_current_user)])
def toggle_publish(post_id: int, db: Session = Depends(get_db)):
    post = _get_or_404(post_id, db)
    post.published = not post.published
    if post.published and not post.published_at:
        post.published_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(post)
    return post


@router.delete("/{post_id}", status_code=204, dependencies=[Depends(get_current_user)])
def delete_post(post_id: int, db: Session = Depends(get_db)):
    post = _get_or_404(post_id, db)
    db.delete(post)
    db.commit()
