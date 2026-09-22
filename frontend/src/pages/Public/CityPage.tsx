import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { ParallaxHero } from "../../components/ParallaxHero";
import { HreflangTags } from "../../i18n/HreflangTags";
import { useLang } from "../../i18n/LanguageContext";
import { whatsAppLinkProps } from "../../utils/whatsapp";
import { WhatsAppIcon } from "../../components/WhatsAppIcon";
import { findCityPage } from "./cityData";
import NotFoundPage from "./NotFoundPage";

const SITE_URL = "https://caminoamiboda.com";
const WHATSAPP_NUMBER = "573147372030";

/** One reusable page for every city landing page (mejoras.md ítem 4,
 * "páginas por ciudad") — content lives in cityData.ts, not copy-pasted
 * JSX per city, so there's exactly one template to keep in sync with the
 * rest of the site (trust numbers, CTA copy, hero pattern). Registered as
 * three static routes in App.tsx (bodas-medellin, bodas-rionegro-
 * llanogrande, bodas-carmen-de-viboral), each passing its own citySlug —
 * not one dynamic "bodas-:city" route, since react-router v6 doesn't match
 * a literal prefix fused onto a dynamic segment. See cityData.ts's `slug`
 * field and backend/app/routers/seo.py's _STATIC_PATHS, which must list
 * the same three paths for the sitemap.
 *
 * Deliberately does NOT filter the catalog by the vehicle's `location`
 * field (unlike the honest instinct to do so) — confirmed against the
 * DB that 28 of 31 active vehicles are tagged "medellin" even though
 * every vehicle already has a Llanogrande price and routinely works
 * weddings there (it's a delivery service, not fixed local stock per
 * city). Filtering by location would undersell the fleet on the
 * Rionegro/Carmen de Viboral pages down to 1-2 cars. Links to the full,
 * unfiltered catalog instead. */
export default function CityPage({ citySlug }: { citySlug: string }) {
  const { t, lang, pickLocalized } = useLang();
  const data = findCityPage(citySlug);

  if (!data) return <NotFoundPage />;

  const catalogPath = lang === "en" ? "/en/catalogo" : "/catalogo";
  const canonicalPath = `/bodas-${data.slug}`;
  const pageTitle = pickLocalized(data.title, data.title_en);
  const description = pickLocalized(data.metaDescription, data.metaDescription_en);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: t("nav.catalog"), item: `${SITE_URL}/catalogo` },
      { "@type": "ListItem", position: 2, name: pageTitle, item: `${SITE_URL}${canonicalPath}` },
    ],
  };

  return (
    <div className="max-w-3xl mx-auto space-y-10">
      <Helmet>
        <title>{`${pageTitle} | Camino a mi Boda`}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={description} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>
      <HreflangTags path={canonicalPath} />

      <nav className="flex items-center gap-1.5 text-sm text-gray-500">
        <Link to={catalogPath} className="hover:text-brand-600 flex items-center gap-1">
          <ChevronLeft size={14} />
          {t("vehiclePage.backToCatalog")}
        </Link>
      </nav>

      <ParallaxHero title={pageTitle} subtitle={pickLocalized(data.heroSubtitle, data.heroSubtitle_en)} />

      {/* Intro — the actual "unique, useful text" mejoras.md asked for,
          one genuinely distinct angle per city (see cityData.ts). */}
      <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-6 sm:p-8 space-y-3">
        <h2 className="text-lg font-bold text-gray-900">{pickLocalized(data.introTitle, data.introTitle_en)}</h2>
        <p className="text-sm text-gray-600 leading-relaxed">{pickLocalized(data.introBody, data.introBody_en)}</p>
      </div>

      {/* Trust — same real numbers ComoFuncionaPage shows, not new claims */}
      <div className="text-center py-2">
        <div className="flex items-center justify-center gap-6 sm:gap-10 mb-6">
          <div className="text-center">
            <p className="text-2xl sm:text-3xl font-bold text-brand-600">{t("comoFunciona.trustExperienceYears")}</p>
            <p className="text-xs sm:text-sm text-gray-400 uppercase tracking-wide">{t("comoFunciona.trustExperienceLabel")}</p>
          </div>
          <div className="w-px h-10 bg-gray-200" />
          <div className="text-center">
            <p className="text-2xl sm:text-3xl font-bold text-brand-600">{t("comoFunciona.trustEventsCount")}</p>
            <p className="text-xs sm:text-sm text-gray-400 uppercase tracking-wide">{t("comoFunciona.trustEventsLabel")}</p>
          </div>
        </div>
      </div>

      {/* Final CTA — full catalog, not a location-filtered subset (see
          module comment above) */}
      <div className="bg-brand-50 rounded-2xl p-6 sm:p-8 text-center space-y-4">
        <h2 className="text-lg font-bold text-gray-900">{t("comoFunciona.finalCtaTitle")}</h2>
        <p className="text-sm text-gray-600 max-w-md mx-auto">{t("comoFunciona.finalCtaBody")}</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}`}
            {...whatsAppLinkProps()}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-6 py-3 rounded-xl shadow-sm shadow-brand-500/25 hover:shadow-md hover:shadow-brand-500/30 transition-all active:scale-[0.98] cursor-pointer"
          >
            <WhatsAppIcon className="w-4 h-4" />
            {t("comoFunciona.finalCtaWhatsapp")}
          </a>
          <Link
            to={catalogPath}
            className="w-full sm:w-auto bg-white border border-brand-200 hover:bg-brand-50 text-brand-700 text-sm font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            {t("comoFunciona.finalCtaCatalog")}
          </Link>
        </div>
      </div>
    </div>
  );
}
