from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class BlogPostCreate(BaseModel):
    title: str
    slug: str
    excerpt: Optional[str] = None
    content_md: Optional[str] = None
    cover_image_url: Optional[str] = None
    published: bool = False


class BlogPostUpdate(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    excerpt: Optional[str] = None
    content_md: Optional[str] = None
    cover_image_url: Optional[str] = None
    published: Optional[bool] = None


class BlogPostRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    slug: str
    excerpt: Optional[str] = None
    content_md: Optional[str] = None
    cover_image_url: Optional[str] = None
    published: bool
    published_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
