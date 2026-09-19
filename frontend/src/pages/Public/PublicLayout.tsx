import { useState } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Menu, X, Phone, Mail, Instagram, Facebook, Languages, LayoutDashboard } from "lucide-react";
import { AiChatWidget } from "../../components/chat/AiChatWidget";
import { WhatsAppIcon } from "../../components/WhatsAppIcon";
import { useLang } from "../../i18n/LanguageContext";
import { toLangPath } from "../../i18n/langPath";
import { whatsAppLinkProps } from "../../utils/whatsapp";
import { useAuth } from "../../context/AuthContext";
import { CITY_PAGES } from "./cityData";

const WHATSAPP_NUMBER = "573147372030";

// Sitewide LocalBusiness structured data (SEO/GEO checklist — see
// docs/desarrollo/seo-geo-marketing-checklist.md). Rendered once here
// since react-helmet-async merges every nested <Helmet> in the tree, so
// each page's own <Helmet> (title, per-page JSON-LD, etc.) still layers
// on top without conflict. Static/constant — defined outside the
// component so it isn't rebuilt on every render.
const LOCAL_BUSINESS_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "Camino a mi Boda",
  image: "https://caminoamiboda.com/favicon.png",
  url: "https://caminoamiboda.com",
  telephone: `+${WHATSAPP_NUMBER}`,
  address: {
    "@type": "PostalAddress",
    // streetAddress/postalCode added 2026-09-17 — Google's Rich Results
    // Test flagged both as missing (non-critical, but recommended) on the
    // LocalBusiness schema; confirmed with the owner before adding a real
    // address here (a wedding car rental doesn't necessarily have a
    // public storefront, so this wasn't assumed).
    streetAddress: "Cra. 35 #19-620, Int 2303",
    postalCode: "050021",
    addressLocality: "Medellín",
    addressRegion: "Antioquia",
    addressCountry: "CO",
  },
  // Antioquia listed alongside the specific zones on purpose (not
  // replacing them) — the FAQ (comoFunciona.faqA5) already documents this:
  // Medellín/área metropolitana and Oriente Antioqueño are served most
  // frequently, but any municipality in Antioquia is in scope on request.
  // Keeping the named places too matters for long-tail local search
  // ("boda en Rionegro") that "Antioquia" alone wouldn't rank for.
  areaServed: [
    "Antioquia",
    "Medellín",
    "Área Metropolitana",
    "Oriente Antioqueño",
    "Rionegro",
    "Llanogrande",
    "El Carmen de Viboral",
    "La Ceja",
    "El Retiro",
    "Guarne",
    "Guatapé",
  ],
  // Instagram was already linked everywhere; the Facebook page
  // (facebook.com/caminoamiboda) exists and is active but wasn't
  // referenced anywhere in the code until now (GEO checklist) — more
  // verified sameAs entries is a stronger "this is a real, verifiable
  // business" signal for both Google and AI answer engines.
  sameAs: ["https://www.instagram.com/caminoamiboda", "https://www.facebook.com/caminoamiboda"],
  description:
    "Alquiler de vehículos clásicos, vintage y modernos con conductor para bodas y eventos especiales en Medellín, el Oriente Antioqueño y el resto de Antioquia, Colombia.",
};

export function PublicLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { t, lang, setLang, pickLocalized } = useLang();
  const { user, loading } = useAuth();
  const location = useLocation();

  // Catalog, Productions and Reviews all point at the same /catalogo
  // pathname and only differ by query string or hash — react-router's
  // NavLink only compares pathname, so all three used to light up as
  // "active" at once. Computed manually here instead, so exactly one link
  // (or none) is active at a time.
  const catalogPath = toLangPath("/catalogo", lang);
  const howItWorksPath = toLangPath("/como-funciona", lang);
  const blogPath = toLangPath("/blog", lang);
  const contactPath = toLangPath("/contacto", lang);
  // The bare root ("/" or "/en") now also renders the catalog directly
  // (see App.tsx / PUBLIC_SITE_ROUTES) — counts as "on the catalog page"
  // too, so the nav highlights correctly regardless of which of the two
  // equivalent URLs a visitor actually landed on.
  const onCatalogPage = location.pathname === catalogPath || location.pathname === "/" || location.pathname === "/en";

  const NAV_LINKS = [
    {
      to: catalogPath,
      label: t("nav.catalog"),
      isActive: onCatalogPage && !location.search && location.hash !== "#opiniones",
    },
    {
      to: `${catalogPath}?use_case=audiovisual_production,brand_activation`,
      label: t("nav.productions"),
      isActive: onCatalogPage && location.search.includes("use_case"),
    },
    {
      to: howItWorksPath,
      label: t("nav.howItWorks"),
      isActive: location.pathname === howItWorksPath,
    },
    {
      to: `${catalogPath}#opiniones`,
      label: t("nav.opinions"),
      isActive: onCatalogPage && location.hash === "#opiniones",
    },
    {
      to: blogPath,
      label: t("nav.blog"),
      isActive: location.pathname === blogPath || location.pathname.startsWith(`${blogPath}/`),
    },
    {
      to: contactPath,
      label: t("nav.contact"),
      isActive: location.pathname === contactPath,
    },
  ];

  const LanguageSwitch = ({ className = "" }: { className?: string }) => (
    <button
      onClick={() => setLang(lang === "es" ? "en" : "es")}
      aria-label={t("layout.languageSwitchAria")}
      className={`flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-brand-600 transition-colors cursor-pointer ${className}`}
    >
      <Languages size={16} />
      {lang === "es" ? "EN" : "ES"}
    </button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white flex flex-col">
      <Helmet>
        {/* Sitewide default — see index.html's comment on why this lives
            here now instead of as a static tag: a page-specific <Helmet>
            further down the tree (catalog, blog, each vehicle page, etc.)
            correctly replaces this, since react-helmet-async only dedupes
            tags it rendered itself. */}
        <meta name="description" content={LOCAL_BUSINESS_JSON_LD.description} />
        <script type="application/ld+json">{JSON.stringify(LOCAL_BUSINESS_JSON_LD)}</script>
      </Helmet>
      {/* Header */}
      <header className="bg-white border-b border-brand-100 shadow-sm sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          {/* min-w-0 (not shrink-0) lets this shrink below the tagline's
              unwrapped width — without it, the tagline's own max-content
              width forced the whole block to ~288px on a 320px viewport,
              pushing the hamburger button (below) entirely off-screen. */}
          <Link to={toLangPath("/catalogo", lang)} className="min-w-0">
            <span className="font-brand text-3xl text-brand-500">Camino a mi Boda</span>
            <p className="text-xs text-gray-400 mt-0.5 truncate">{t("layout.tagline")}</p>
          </Link>

          {/* Desktop nav — shown from xl (1280px) up. The 6 labels need
              ~1130px to sit on one line without wrapping; below that (even
              at 1024px) they broke into 2-3 uneven lines, which read as
              "crowded" — the hamburger menu covers that whole range instead. */}
          <nav className="hidden xl:flex items-center gap-6">
            {NAV_LINKS.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-sm font-medium whitespace-nowrap transition-colors ${
                  link.isActive ? "text-brand-600" : "text-gray-600 hover:text-brand-600"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {!loading && user && (
              <Link
                to="/dashboard"
                className="hidden sm:flex p-2 rounded-lg text-gray-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                title={t("nav.goToPanel")}
                aria-label={t("nav.goToPanel")}
              >
                <LayoutDashboard size={18} />
              </Link>
            )}
            <LanguageSwitch className="hidden sm:flex" />
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}`}
              {...whatsAppLinkProps()}
              className="hidden sm:flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-sm shadow-brand-500/25 hover:shadow-md hover:shadow-brand-500/30 transition-all active:scale-[0.98] cursor-pointer whitespace-nowrap"
            >
              <WhatsAppIcon className="w-4 h-4" />
              {t("layout.contactUs")}
            </a>
            <button
              onClick={() => setMenuOpen(o => !o)}
              // p-3 (not p-2) so the 22px icon clears the 44x44 minimum
              // touch target (measured 38x38 at p-2 — under both Apple
              // HIG's 44pt and Material's 48dp minimums) on every public
              // page that shares this header, including the mobile
              // /evento/{token} share view.
              className="xl:hidden p-3 text-gray-500 hover:text-brand-600 cursor-pointer"
              aria-label={t("layout.mobileMenuAria")}
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {menuOpen && (
          <nav className="xl:hidden border-t border-brand-100 px-4 py-3 flex flex-col gap-3">
            {NAV_LINKS.map(link => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMenuOpen(false)}
                className={`text-sm font-medium ${link.isActive ? "text-brand-600" : "text-gray-600"}`}
              >
                {link.label}
              </Link>
            ))}
            {!loading && user && (
              <Link
                to="/dashboard"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-1.5 text-sm font-medium text-brand-700"
              >
                <LayoutDashboard size={15} />
                {t("nav.goToPanel")}
              </Link>
            )}
            <div className="flex items-center justify-between gap-3">
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}`}
                {...whatsAppLinkProps()}
                className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-sm shadow-brand-500/25 active:scale-[0.98] transition-all w-fit"
              >
                <WhatsAppIcon className="w-4 h-4" />
                {t("layout.contactUs")}
              </a>
              <LanguageSwitch />
            </div>
          </nav>
        )}
      </header>

      {/* Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 pt-8 pb-24 md:pb-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-brand-100 mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <span className="font-brand text-2xl text-brand-400">Camino a mi Boda</span>
            <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-500">
              {NAV_LINKS.map(link => (
                <Link key={link.to} to={link.to} className="hover:text-brand-600 transition-colors">
                  {link.label}
                </Link>
              ))}
              <Link to={toLangPath("/politica-de-datos", lang)} className="hover:text-brand-600 transition-colors">
                {t("layout.dataPolicy")}
              </Link>
              <Link to={toLangPath("/politica-de-reservas", lang)} className="hover:text-brand-600 transition-colors">
                {t("layout.reservationPolicy")}
              </Link>
              <Link to={toLangPath("/condiciones-de-servicio", lang)} className="hover:text-brand-600 transition-colors">
                {t("layout.termsOfService")}
              </Link>
            </nav>
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-gray-400 border-t border-gray-100 pt-5">
            <span>{t("layout.serviceAreas")}</span>
            {CITY_PAGES.map((city, i) => (
              <span key={city.slug} className="flex items-center gap-2">
                <Link to={toLangPath(`/bodas-${city.slug}`, lang)} className="hover:text-brand-600 transition-colors">
                  {pickLocalized(city.shortLabel, city.shortLabel_en)}
                </Link>
                {i < CITY_PAGES.length - 1 && <span className="text-gray-200">·</span>}
              </span>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm text-gray-500 border-t border-gray-100 pt-6">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <a href="tel:+573147372030" className="flex items-center gap-1.5 hover:text-brand-600 transition-colors">
                <Phone size={14} /> +(57) 314 737 2030
              </a>
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}`}
                {...whatsAppLinkProps()}
                className="flex items-center gap-1.5 hover:text-green-600 transition-colors"
              >
                <WhatsAppIcon className="w-3.5 h-3.5" /> WhatsApp
              </a>
              <a href="mailto:caminoatuboda@gmail.com" className="flex items-center gap-1.5 hover:text-brand-600 transition-colors">
                <Mail size={14} /> caminoatuboda@gmail.com
              </a>
              <a
                href="https://www.instagram.com/caminoamiboda"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:text-brand-600 transition-colors"
              >
                <Instagram size={14} /> @caminoamiboda
              </a>
              <a
                href="https://www.facebook.com/caminoamiboda"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:text-brand-600 transition-colors"
              >
                <Facebook size={14} /> Facebook
              </a>
            </div>
            <span className="text-xs text-gray-400">{t("layout.city")}</span>
          </div>
        </div>
      </footer>

      <a
        href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(t("floatingWhatsapp.message"))}`}
        {...whatsAppLinkProps()}
        className="fixed bottom-5 left-5 z-40 w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg flex items-center justify-center transition-colors"
        aria-label={t("floatingWhatsapp.openAria")}
      >
        <WhatsAppIcon className="w-6 h-6" />
      </a>

      <AiChatWidget />
    </div>
  );
}
