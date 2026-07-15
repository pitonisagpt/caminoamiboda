import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { Menu, X, Phone, Mail, Instagram } from "lucide-react";

const WHATSAPP_NUMBER = "573147372030";

const NAV_LINKS = [
  { to: "/catalogo", label: "Catálogo" },
  { to: "/blog", label: "Blog" },
  { to: "/contacto", label: "Contacto" },
];

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

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
    </div>
  );
}
