import { useState, useEffect } from "react";
import { BookOpen, BookUser, Calendar, Car, ChevronLeft, ChevronRight, ClipboardList, FileText, Heart, LayoutDashboard, LogOut, MapPin, Menu, TrendingUp, Truck, User, Users } from "lucide-react";
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
  collapsed?: boolean;
}

function NavItem({ to, icon: Icon, label, end = false, onClick, collapsed }: NavItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 cursor-pointer
        ${collapsed ? 'justify-center px-2' : ''}
        ${isActive ? "bg-pink-50 text-pink-700" : "text-gray-600 hover:text-pink-700 hover:bg-pink-50"}`
      }
    >
      <Icon size={17} className="shrink-0" />
      {!collapsed && label}
    </NavLink>
  );
}

function SidebarSection({ label, collapsed }: { label: string; collapsed?: boolean }) {
  if (collapsed) return <div className="my-1 border-t border-pink-50" />;
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
  const [desktopCollapsed, setDesktopCollapsed] = useState(
    () => localStorage.getItem('sidebar-collapsed') === 'true'
  );

  const closeSidebar = () => setSidebarOpen(false);

  const toggleDesktop = () => {
    setDesktopCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebar-collapsed', String(next));
      return next;
    });
  };

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

  const c = desktopCollapsed;
  const sidebarW = c ? 'lg:w-[60px]' : 'lg:w-60';
  const mainML = c ? 'lg:ml-[60px]' : 'lg:ml-60';

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
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-pink-100 shadow-sm
          transition-all duration-200 ease-in-out w-60 ${sidebarW}
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        {/* Brand */}
        <div className={`h-14 flex items-center border-b border-pink-100 shrink-0 ${c ? 'justify-center px-2' : 'px-4'}`}>
          {c
            ? <span className="font-brand text-lg text-pink-600">C</span>
            : <span className="font-brand text-xl text-pink-600">Camino a mi Boda</span>
          }
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          <NavItem to="/" end icon={LayoutDashboard} label="Dashboard" onClick={closeSidebar} collapsed={c} />

          <SidebarSection label="Operaciones" collapsed={c} />
          <NavItem to="/calendario"   icon={Calendar}      label="Calendario"   onClick={closeSidebar} collapsed={c} />
          <NavItem to="/reservas"     icon={ClipboardList} label="Reservas"     onClick={closeSidebar} collapsed={c} />
          <NavItem to="/ubicaciones"  icon={MapPin}        label="Ubicaciones"  onClick={closeSidebar} collapsed={c} />
          <NavItem to="/cotizaciones" icon={FileText}      label="Cotizaciones" onClick={closeSidebar} collapsed={c} />

          <SidebarSection label="Clientes & Flota" collapsed={c} />
          <NavItem to="/clientes"    icon={Heart}    label="Clientes"    onClick={closeSidebar} collapsed={c} />
          <NavItem to="/vehiculos"   icon={Car}      label="Vehículos"   onClick={closeSidebar} collapsed={c} />
          <NavItem to="/conductores" icon={Truck}    label="Conductores" onClick={closeSidebar} collapsed={c} />
          <NavItem to="/contactos"   icon={BookUser} label="Contactos"   onClick={closeSidebar} collapsed={c} />

          {isAdmin && (
            <>
              <SidebarSection label="Administración" collapsed={c} />
              <NavItem to="/propietarios"   icon={User}     label="Propietarios" onClick={closeSidebar} collapsed={c} />
              <NavItem to="/admin/usuarios" icon={Users}    label="Usuarios"     onClick={closeSidebar} collapsed={c} />
              <NavItem to="/blog-admin"     icon={BookOpen} label="Blog"         onClick={closeSidebar} collapsed={c} />
            </>
          )}

          <SidebarSection label="Finanzas" collapsed={c} />
          <NavItem to="/finanzas"   icon={TrendingUp} label="Dashboard Financiero" onClick={closeSidebar} collapsed={c} />
          <NavItem to="/documentos" icon={FileText}   label="Cuentas de Cobro"     onClick={closeSidebar} collapsed={c} />
        </nav>

        {/* User footer + desktop toggle */}
        <div className="shrink-0 border-t border-pink-100">
          {!c && (
            <div className="p-3 flex items-center gap-2">
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
          )}
          {c && (
            <div className="flex flex-col items-center gap-1 py-2">
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg text-gray-400 hover:text-pink-600 hover:bg-pink-50 transition-colors cursor-pointer"
                title="Cerrar sesión"
              >
                <LogOut size={17} />
              </button>
            </div>
          )}
          {/* Desktop collapse toggle */}
          <div className="hidden lg:flex justify-center pb-2">
            <button
              onClick={toggleDesktop}
              className="p-1.5 rounded-lg text-gray-400 hover:text-pink-600 hover:bg-pink-50 transition-colors cursor-pointer"
              title={c ? 'Expandir menú' : 'Colapsar menú'}
            >
              {c ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className={`${mainML} pt-14 lg:pt-0 transition-all duration-200`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <Outlet />
        </div>
      </main>

    </div>
  );
}
