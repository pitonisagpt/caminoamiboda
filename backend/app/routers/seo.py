from xml.sax.saxutils import escape

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.blog_post import BlogPost

router = APIRouter(tags=["seo"])

# Was missing "como-funciona" and "politica-de-reservas" — an unrelated,
# pre-existing gap found while wiring up bilingual sitemap entries below.
_STATIC_PATHS = ["", "catalogo", "como-funciona", "blog", "contacto", "politica-de-datos", "politica-de-reservas"]


def _hreflang_block(es_url: str, en_url: str | None) -> str:
    """<xhtml:link> alternates for one <url> entry. x-default and "es" both
    point at the Spanish URL — Spanish is the canonical default language."""
    links = [
        f'    <xhtml:link rel="alternate" hreflang="es" href="{escape(es_url)}"/>',
        f'    <xhtml:link rel="alternate" hreflang="x-default" href="{escape(es_url)}"/>',
    ]
    if en_url:
        links.append(f'    <xhtml:link rel="alternate" hreflang="en" href="{escape(en_url)}"/>')
    return "\n".join(links)


@router.get("/sitemap.xml", include_in_schema=False)
def sitemap(db: Session = Depends(get_db)):
    base = settings.frontend_url.rstrip("/")

    entries = []
    for path in _STATIC_PATHS:
        es_url = f"{base}/{path}" if path else base
        en_url = f"{base}/en/{path}" if path else f"{base}/en"
        entries.append(f"  <url><loc>{escape(es_url)}</loc>\n{_hreflang_block(es_url, en_url)}\n  </url>")
        entries.append(f"  <url><loc>{escape(en_url)}</loc>\n{_hreflang_block(es_url, en_url)}\n  </url>")

    posts = (
        db.query(BlogPost)
        .filter(BlogPost.published == True)  # noqa: E712
        .order_by(BlogPost.published_at.desc())
        .all()
    )
    for post in posts:
        es_url = f"{base}/blog/{post.slug}"
        lastmod = (post.updated_at or post.published_at)
        lastmod_tag = f"<lastmod>{lastmod.date().isoformat()}</lastmod>" if lastmod else ""
        has_en = bool(post.slug_en and post.content_md_en)
        en_url = f"{base}/en/blog/{post.slug_en}" if has_en else None

        entries.append(
            f"  <url><loc>{escape(es_url)}</loc>{lastmod_tag}\n{_hreflang_block(es_url, en_url)}\n  </url>"
        )
        if en_url:
            entries.append(
                f"  <url><loc>{escape(en_url)}</loc>{lastmod_tag}\n{_hreflang_block(es_url, en_url)}\n  </url>"
            )

    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
        'xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
        + "\n".join(entries)
        + "\n</urlset>\n"
    )
    return Response(content=xml, media_type="application/xml; charset=utf-8")
