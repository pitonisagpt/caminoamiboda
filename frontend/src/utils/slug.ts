/** Shared slug helpers — used by the blog admin's own slug field and by
 * the per-vehicle SEO landing pages (`/carros/<id>-<slug>`).
 *
 * Diacritics are stripped by Unicode combining-mark code point (NFD
 * decomposition, then filter) rather than a regex character class with
 * embedded `\u` escapes or literal accented characters — same reasoning
 * as `stripInvisibleChars` in `utils/whatsapp.ts`: embedding raw Unicode
 * ranges directly in a regex literal is exactly the kind of silent,
 * hard-to-review mistake this project has already been bitten by once
 * (a genuinely invisible character broke a wa.me link — see that file's
 * history). Keeping this numeric instead of regex-range-based avoids the
 * same risk here. */
export function slugify(text: string): string {
  const COMBINING_DIACRITIC_START = 0x0300;
  const COMBINING_DIACRITIC_END = 0x036f;
  const withoutDiacritics = Array.from(text.normalize("NFD"))
    .filter((ch) => {
      const code = ch.codePointAt(0) as number;
      return !(code >= COMBINING_DIACRITIC_START && code <= COMBINING_DIACRITIC_END);
    })
    .join("");
  return withoutDiacritics
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Builds the "<id>-<descriptive-slug>" path segment for a vehicle's
 * public landing page — no database migration needed for a pretty URL:
 * the numeric id prefix is what's actually looked up (see
 * parseVehicleIdFromSlug below), the rest is just for readability/SEO.
 * Same technique large marketplaces (Airbnb, Etsy) use for listing URLs. */
export function vehicleSlugPath(vehicle: { id: number; brand: string; model_line?: string | null; color?: string | null }): string {
  const words = [vehicle.brand, vehicle.model_line, vehicle.color].filter(Boolean).join(" ");
  const slug = slugify(words);
  return slug ? `${vehicle.id}-${slug}` : String(vehicle.id);
}

/** Parses the leading numeric id out of a "<id>-<slug>" URL param.
 * `parseInt` stops at the first non-digit character, so this works
 * whether or not the descriptive part is present or has drifted (e.g. the
 * vehicle's brand/color changed after the link was shared) — the id is
 * always the source of truth, never the slug text. Returns null for a
 * malformed param (no leading digits) rather than NaN. */
export function parseVehicleIdFromSlug(param: string | undefined): number | null {
  if (!param) return null;
  const id = parseInt(param, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}
