import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { Menu, X, Phone, Mail, Instagram } from "lucide-react";
import { AiChatWidget } from "../../components/chat/AiChatWidget";
import { WhatsAppIcon } from "../../components/WhatsAppIcon";

const WHATSAPP_NUMBER = "573147372030";

const NAV_LINKS = [
  { to: "/catalogo", label: "Catálogo" },
  { to: "/catalogo?use_case=audiovisual_production,brand_activation", label: "Producciones y Activaciones" },
  { to: "/como-funciona", label: "Cómo funciona" },
  { to: "/catalogo#opiniones", label: "Opiniones" },
  { to: "/blog", label: "Blog" },
  { to: "/contacto", label: "Contacto" },
];

export function PublicLayout() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-brand-100 shadow-sm sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <Link to="/" className="shrink-0">
            <span className="font-brand text-3xl text-brand-500">Camino a mi Boda</span>
            <p className="text-xs text-gray-400 mt-0.5">Vehículos clásicos y especiales para tu día</p>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `text-sm font-medium transition-colors ${
                    isActive ? "text-brand-600" : "text-gray-600 hover:text-brand-600"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors cursor-pointer"
            >
              <WhatsAppIcon className="w-4 h-4" />
              Contáctanos
            </a>
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="md:hidden p-2 text-gray-500 hover:text-brand-600 cursor-pointer"
              aria-label="Abrir menú"
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {menuOpen && (
          <nav className="md:hidden border-t border-brand-100 px-4 py-3 flex flex-col gap-3">
            {NAV_LINKS.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `text-sm font-medium ${isActive ? "text-brand-600" : "text-gray-600"}`
                }
              >
                {link.label}
              </NavLink>
            ))}
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-green-500 text-white text-sm font-medium px-4 py-2 rounded-lg w-fit"
            >
              <WhatsAppIcon className="w-4 h-4" />
              Contáctanos
            </a>
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
            <nav className="flex items-center gap-5 text-sm text-gray-500">
              {NAV_LINKS.map(link => (
                <Link key={link.to} to={link.to} className="hover:text-brand-600 transition-colors">
                  {link.label}
                </Link>
              ))}
              <Link to="/politica-de-datos" className="hover:text-brand-600 transition-colors">
                Política de datos
              </Link>
              <Link to="/politica-de-reservas" className="hover:text-brand-600 transition-colors">
                Política de reservas
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
                target="_blank"
                rel="noopener noreferrer"
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
            <span className="text-xs text-gray-400">Medellín, Colombia</span>
          </div>
        </div>
      </footer>

      <AiChatWidget />
    </div>
  );
}
