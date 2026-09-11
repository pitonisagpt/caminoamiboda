import { useState } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { Menu, X, Phone, Mail, Instagram, Languages, LayoutDashboard } from "lucide-react";
import { AiChatWidget } from "../../components/chat/AiChatWidget";
import { WhatsAppIcon } from "../../components/WhatsAppIcon";
import { useLang } from "../../i18n/LanguageContext";
import { toLangPath } from "../../i18n/langPath";
import { whatsAppLinkProps } from "../../utils/whatsapp";
import { useAuth } from "../../context/AuthContext";

const WHATSAPP_NUMBER = "573147372030";

export function PublicLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { t, lang, setLang } = useLang();
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
              className="xl:hidden p-2 text-gray-500 hover:text-brand-600 cursor-pointer"
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
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8">
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
            </div>
            <span className="text-xs text-gray-400">{t("layout.city")}</span>
          </div>
        </div>
      </footer>

      <AiChatWidget />
    </div>
  );
}
