import re
import unicodedata
from xml.sax.saxutils import escape

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.blog_post import BlogPost
from app.models.vehicle import Vehicle, VehicleStatus

router = APIRouter(tags=["seo"])


def _slugify(text: str) -> str:
    """Mirrors frontend/src/utils/slug.ts's slugify() exactly (NFD
    decompose + strip combining marks, not a regex range over literal
    accented characters — same reasoning as that file: an embedded
    Unicode range in a regex literal is an easy, hard-to-review way to
    get this subtly wrong)."""
    decomposed = unicodedata.normalize("NFD", text)
    without_diacritics = "".join(c for c in decomposed if not unicodedata.combining(c))
    slug = without_diacritics.lower()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"[\s-]+", "-", slug)
    return slug.strip("-")


def _vehicle_slug_path(vehicle: Vehicle) -> str:
    """Mirrors frontend/src/utils/slug.ts's vehicleSlugPath() — the id
    prefix is what the frontend route actually parses, the rest is only
    for readability/SEO, so this doesn't need to be byte-for-byte
    identical to what the frontend renders, just consistent."""
    words = " ".join(filter(None, [vehicle.brand, vehicle.model_line, vehicle.color]))
    slug = _slugify(words)
    return f"{vehicle.id}-{slug}" if slug else str(vehicle.id)

# Was missing "como-funciona" and "politica-de-reservas" — an unrelated,
# pre-existing gap found while wiring up bilingual sitemap entries below.
_STATIC_PATHS = [
    # "" (bare root) deliberately excluded — it now serves the same
    # CatalogPage as "catalogo" (see frontend/src/App.tsx), which declares
    # "catalogo" as its canonical URL. Listing both here would list a
    # non-canonical duplicate alongside the canonical one.
    "catalogo", "como-funciona", "blog", "contacto",
    "politica-de-datos", "politica-de-reservas", "condiciones-de-servicio",
    # City landing pages (mejoras.md ítem 4) — must match the `slug` values
    # in frontend/src/pages/Public/cityData.ts exactly (prefixed "bodas-").
    "bodas-medellin", "bodas-rionegro-llanogrande", "bodas-carmen-de-viboral",
]


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

    # Per-vehicle SEO landing pages (/carros/<id>-<slug>) — same active-only
    # filter GET /api/vehicles applies by default, so the sitemap never
    # lists a vehicle the public catalog itself wouldn't show.
    vehicles = db.query(Vehicle).filter(Vehicle.status == VehicleStatus.active).order_by(Vehicle.display_order).all()
    for vehicle in vehicles:
        slug_path = _vehicle_slug_path(vehicle)
        es_url = f"{base}/carros/{slug_path}"
        en_url = f"{base}/en/carros/{slug_path}"
        lastmod_tag = f"<lastmod>{vehicle.updated_at.date().isoformat()}</lastmod>" if vehicle.updated_at else ""
        entries.append(f"  <url><loc>{escape(es_url)}</loc>{lastmod_tag}\n{_hreflang_block(es_url, en_url)}\n  </url>")
        entries.append(f"  <url><loc>{escape(en_url)}</loc>{lastmod_tag}\n{_hreflang_block(es_url, en_url)}\n  </url>")

    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
        'xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
        + "\n".join(entries)
        + "\n</urlset>\n"
    )
    return Response(content=xml, media_type="application/xml; charset=utf-8")
