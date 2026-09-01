export type Lang = "es" | "en";

/** Reads the language from a pathname — anything under `/en` (bare `/en` or
 * `/en/...`) is English, everything else is Spanish (the canonical default,
 * unchanged URLs). */
export function getLangFromPath(pathname: string): Lang {
  return pathname === "/en" || pathname.startsWith("/en/") ? "en" : "es";
}

/** Adds or strips the `/en` prefix from a pathname, idempotent either way.
 * `pathname` is expected to start with "/" (i.e. `location.pathname`). */
export function toLangPath(pathname: string, lang: Lang): string {
  const isEn = pathname === "/en" || pathname.startsWith("/en/");
  const bare = isEn ? (pathname.slice(3) || "/") : pathname;
  if (lang === "es") return bare;
  return bare === "/" ? "/en" : `/en${bare}`;
}
