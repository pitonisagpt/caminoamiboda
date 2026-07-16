from xml.sax.saxutils import escape

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.blog_post import BlogPost

router = APIRouter(tags=["seo"])

_STATIC_PATHS = ["", "catalogo", "blog", "contacto", "politica-de-datos"]


@router.get("/sitemap.xml", include_in_schema=False)
def sitemap(db: Session = Depends(get_db)):
    base = settings.frontend_url.rstrip("/")

    urls = [f"{base}/{path}" if path else base for path in _STATIC_PATHS]
    entries = [f"  <url><loc>{escape(url)}</loc></url>" for url in urls]

    posts = (
        db.query(BlogPost)
        .filter(BlogPost.published == True)  # noqa: E712
        .order_by(BlogPost.published_at.desc())
        .all()
    )
    for post in posts:
        loc = escape(f"{base}/blog/{post.slug}")
        lastmod = (post.updated_at or post.published_at)
        lastmod_tag = f"<lastmod>{lastmod.date().isoformat()}</lastmod>" if lastmod else ""
        entries.append(f"  <url><loc>{loc}</loc>{lastmod_tag}</url>")

    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "\n".join(entries)
        + "\n</urlset>\n"
    )
    return Response(content=xml, media_type="application/xml; charset=utf-8")
