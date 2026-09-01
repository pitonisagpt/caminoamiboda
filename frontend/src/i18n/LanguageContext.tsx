import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { es, type TranslationKey } from "./es";
import { en } from "./en";
import { interpolate } from "./interpolate";
import { pickLocalized as pickLocalizedFn } from "./pickLocalized";
import { getLangFromPath, toLangPath, type Lang } from "./langPath";

const DICTIONARIES: Record<Lang, Record<TranslationKey, string>> = { es, en };
const STORAGE_KEY = "cab_lang";

interface LangContextValue {
  lang: Lang;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
  setLang: (lang: Lang) => void;
  pickLocalized: (esText: string, enText: string | null | undefined) => string;
}

const LanguageContext = createContext<LangContextValue | null>(null);

/**
 * Wraps the public site's routes (mounted once for the bare/Spanish paths,
 * once under `/en` — see App.tsx). Derives the current language from the
 * URL (source of truth), and on first visit with no stored preference,
 * redirects once to the browser-language-appropriate version. An explicit
 * `/en` URL (a shared link, a search result) is always respected as-is —
 * only a bare Spanish path with no stored preference and a non-Spanish
 * `navigator.language` gets redirected.
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const lang = getLangFromPath(location.pathname);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return; // user already made an explicit choice — respect it
    if (lang === "en") return; // already on an explicit /en URL — never redirect away

    const browserLang = navigator.language || (navigator.languages && navigator.languages[0]) || "es";
    if (!browserLang.toLowerCase().startsWith("es")) {
      navigate(toLangPath(location.pathname, "en") + location.search + location.hash, { replace: true });
    }
    // Only ever run on first mount of this provider instance — re-runs on
    // every render would fight with the user navigating around the site.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLang = (next: Lang) => {
    localStorage.setItem(STORAGE_KEY, next);
    navigate(toLangPath(location.pathname, next) + location.search + location.hash);
  };

  const value = useMemo<LangContextValue>(
    () => ({
      lang,
      t: (key, vars) => interpolate(DICTIONARIES[lang][key], vars),
      setLang,
      pickLocalized: (esText, enText) => pickLocalizedFn(esText, enText, lang),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lang]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLang(): LangContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLang() must be used within a LanguageProvider");
  return ctx;
}
