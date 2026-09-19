/**
 * Derives the WebP/"card"-size sibling URLs of a vehicle photo's base
 * JPEG URL. Mirrors the naming convention the backend writes to disk in
 * `variant_file_names()` (backend/app/core/image_utils.py) — same
 * "<uuid>.jpg" -> "<uuid>.webp" / "<uuid>-card.jpg" / "<uuid>-card.webp"
 * scheme, kept in sync by hand since it crosses the Python/TS boundary.
 *
 * Not every photo has these — an animated GIF/WEBP upload skips variant
 * generation entirely (see generate_responsive_variants() docstring). A
 * missing <source> just falls through to the <img> fallback in a
 * <picture> element, so callers don't need to check existence first.
 */
export interface PhotoVariantUrls {
  fullWebp: string;
  cardJpg: string;
  cardWebp: string;
}

export function photoVariantUrls(jpgUrl: string): PhotoVariantUrls {
  const dot = jpgUrl.lastIndexOf(".");
  const base = dot === -1 ? jpgUrl : jpgUrl.slice(0, dot);
  return {
    fullWebp: `${base}.webp`,
    cardJpg: `${base}-card.jpg`,
    cardWebp: `${base}-card.webp`,
  };
}
