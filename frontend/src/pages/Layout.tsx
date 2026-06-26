import { useState, useEffect } from "react";
import { BookUser, Calendar, Car, ClipboardList, FileText, Heart, LayoutDashboard, LogOut, Menu, Truck, User, Users } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Badge } from "../components/ui/Badge";
import type { LucideIcon } from "lucide-react";

interface NavItemProps {
  to: string;
  icon: LucideIcon;
  label: string;
  end?: boolean;
  onClick?: () => void;
}

function NavItem({ to, icon: Icon, label, end = false, onClick }: NavItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 cursor-pointer
        ${isActive ? "bg-pink-50 text-pink-700" : "text-gray-600 hover:text-pink-700 hover:bg-pink-50"}`
      }
    >
      <Icon size={17} />
      {label}
    </NavLink>
  );
}

function SidebarSection({ label }: { label: string }) {
  return (
    <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
      {label}
    </p>
  );
}

export function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = () => setSidebarOpen(false);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSidebar();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="min-h-screen bg-pink-50">

      {/* Mobile top bar */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-30 h-14 bg-white border-b border-pink-100 shadow-sm flex items-center justify-between px-4">
        <span className="font-brand text-xl text-pink-600">Camino a mi Boda</span>
        <button
          onClick={() => setSidebarOpen(true)}
          aria-label="Abrir menú"
          className="p-2 rounded-lg text-gray-500 hover:bg-pink-50 cursor-pointer transition-colors"
        >
          <Menu size={22} />
        </button>
      </header>

      {/* Backdrop (mobile only) */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/30"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-60 flex flex-col bg-white border-r border-pink-100 shadow-sm
          transition-transform duration-200 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        {/* Brand */}
        <div className="h-14 flex items-center px-4 border-b border-pink-100 shrink-0">
          <span className="font-brand text-xl text-pink-600">Camino a mi Boda</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          <NavItem to="/" end icon={LayoutDashboard} label="Dashboard" onClick={closeSidebar} />

          <SidebarSection label="Operaciones" />
          <NavItem to="/calendario"   icon={Calendar}      label="Calendario"   onClick={closeSidebar} />
          <NavItem to="/reservas"     icon={ClipboardList} label="Reservas"     onClick={closeSidebar} />
          <NavItem to="/cotizaciones" icon={FileText}      label="Cotizaciones" onClick={closeSidebar} />

          <SidebarSection label="Clientes & Flota" />
          <NavItem to="/clientes"    icon={Heart} label="Clientes"    onClick={closeSidebar} />
          <NavItem to="/vehiculos"   icon={Car}   label="Vehículos"   onClick={closeSidebar} />
          <NavItem to="/conductores" icon={Truck} label="Conductores" onClick={closeSidebar} />
          <NavItem to="/contactos"   icon={BookUser} label="Contactos"  onClick={closeSidebar} />

          {isAdmin && (
            <>
              <SidebarSection label="Administración" />
              <NavItem to="/propietarios"   icon={User}  label="Propietarios" onClick={closeSidebar} />
              <NavItem to="/admin/usuarios" icon={Users} label="Usuarios"     onClick={closeSidebar} />
            </>
          )}

          <SidebarSection label="Finanzas" />
          <NavItem to="/documentos" icon={FileText} label="Cuentas de Cobro" onClick={closeSidebar} />
        </nav>

        {/* User footer */}
        <div className="shrink-0 border-t border-pink-100 p-3 flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.full_name}</p>
            <Badge variant={user?.role === "admin" ? "pink" : "gray"} className="text-xs">
              {user?.role === "admin" ? "Admin" : "Operaciones"}
            </Badge>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg text-gray-400 hover:text-pink-600 hover:bg-pink-50 transition-colors cursor-pointer"
            title="Cerrar sesión"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="lg:ml-60 pt-14 lg:pt-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <Outlet />
        </div>
      </main>

    </div>
  );
}
