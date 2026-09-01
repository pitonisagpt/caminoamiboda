from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class BlogPost(Base):
    __tablename__ = "blog_posts"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(300))
    slug: Mapped[str] = mapped_column(String(300), unique=True, index=True)
    excerpt: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    content_md: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # English translation, all optional — a post with no English content simply
    # isn't offered in the /en blog (see routers/blog.py); title_en/slug_en/
    # excerpt_en/content_md_en are only ever all-filled or all-empty by convention,
    # but nothing enforces that at the DB level.
    title_en: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    slug_en: Mapped[Optional[str]] = mapped_column(String(300), unique=True, index=True, nullable=True)
    excerpt_en: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    content_md_en: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    cover_image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    published: Mapped[bool] = mapped_column(Boolean, default=False, server_default='false')
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
