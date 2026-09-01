import { Helmet } from "react-helmet-async";
import { useLang } from "./LanguageContext";

const SITE_URL = "https://caminoamiboda.com";

interface Props {
  /** Bare (no /en) path, e.g. "/catalogo" — used when the same path segment
   * serves both languages. Ignored if esPath/enPath are given instead. */
  path?: string;
  /** Explicit override for pages where the path itself differs by language
   * (blog posts, which can have a distinct English slug). */
  esPath?: string;
  enPath?: string | null;
}

/**
 * Canonical + hreflang tags, shared by every public page so this isn't
 * hand-repeated. Also sets <html lang> for the current route (react-helmet-
 * async merges nested <Helmet> blocks, including <html> attributes).
 */
export function HreflangTags({ path, esPath, enPath }: Props) {
  const { lang } = useLang();
  const finalEsPath = esPath ?? path ?? "";
  const finalEnPath = enPath !== undefined ? enPath : (path ?? "");

  const esUrl = `${SITE_URL}${finalEsPath}`;
  const enUrl = finalEnPath !== null ? `${SITE_URL}/en${finalEnPath}` : null;
  const canonical = lang === "en" && enUrl ? enUrl : esUrl;

  return (
    <Helmet>
      <html lang={lang} />
      <link rel="canonical" href={canonical} />
      <link rel="alternate" hrefLang="es" href={esUrl} />
      {enUrl && <link rel="alternate" hrefLang="en" href={enUrl} />}
      <link rel="alternate" hrefLang="x-default" href={esUrl} />
    </Helmet>
  );
}
