import type { Lang } from "./langPath";

/**
 * Picks the English variant of a bilingual content field when available,
 * falling back to Spanish otherwise. Used for business-authored prose that
 * lives in the database (vehicle bride_description, blog posts, reviews,
 * florist description) — as opposed to fixed UI strings, which go through
 * `t()` instead. Spanish is always a safe fallback since every row already
 * has it; English is optional and may not exist yet for a given row.
 */
export function pickLocalized(es: string, en: string | null | undefined, lang: Lang): string {
  return lang === "en" && en ? en : es;
}
