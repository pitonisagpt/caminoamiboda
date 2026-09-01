import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Compass } from "lucide-react";
import { useLang } from "../../i18n/LanguageContext";

// No HreflangTags here on purpose — this is a wildcard "*" catch-all for an
// arbitrary unmatched path, so there's no single real URL to declare as
// canonical (a canonical pointing at "/" would misleadingly tell search
// engines every 404 hit is the actual homepage).
export default function NotFoundPage() {
  const { t, lang } = useLang();
  return (
    <div className="max-w-lg mx-auto text-center py-20 px-4">
      <Helmet>
        <title>{t("notFound.title")} | Camino a mi Boda</title>
        <html lang={lang} />
      </Helmet>
      <div className="w-16 h-16 rounded-full bg-brand-50 text-brand-400 flex items-center justify-center mx-auto mb-6">
        <Compass size={28} />
      </div>
      <h1 className="text-3xl font-brand text-brand-500 mb-2">{t("notFound.title")}</h1>
      <p className="text-gray-500 mb-8">
        {t("notFound.body")}
      </p>
      <Link
        to={lang === "en" ? "/en/catalogo" : "/catalogo"}
        className="inline-block bg-brand-500 hover:bg-brand-600 text-white font-medium px-6 py-3 rounded-lg transition-colors"
      >
        {t("notFound.cta")}
      </Link>
    </div>
  );
}
