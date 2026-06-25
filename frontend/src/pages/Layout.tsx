import { Calendar, Car, ClipboardList, FileText, Heart, LogOut, Truck, User, Users } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Badge } from "../components/ui/Badge";

export function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-pink-50">
      <header className="bg-white border-b border-pink-100 shadow-sm sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <span className="font-brand text-2xl text-pink-600">Camino a mi Boda</span>

          <nav className="flex items-center gap-1">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 cursor-pointer
                ${isActive ? "bg-pink-50 text-pink-700" : "text-gray-600 hover:text-pink-700 hover:bg-pink-50"}`
              }
            >
              <FileText size={16} />
              Cuentas de Cobro
            </NavLink>

            <NavLink
              to="/vehiculos"
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 cursor-pointer
                ${isActive ? "bg-pink-50 text-pink-700" : "text-gray-600 hover:text-pink-700 hover:bg-pink-50"}`
              }
            >
              <Car size={16} />
              Vehículos
            </NavLink>

            <NavLink
              to="/calendario"
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 cursor-pointer
                ${isActive ? "bg-pink-50 text-pink-700" : "text-gray-600 hover:text-pink-700 hover:bg-pink-50"}`
              }
            >
              <Calendar size={16} />
              Calendario
            </NavLink>

            <NavLink
              to="/reservas"
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 cursor-pointer
                ${isActive ? "bg-pink-50 text-pink-700" : "text-gray-600 hover:text-pink-700 hover:bg-pink-50"}`
              }
            >
              <ClipboardList size={16} />
              Reservas
            </NavLink>

            <NavLink
              to="/cotizaciones"
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 cursor-pointer
                ${isActive ? "bg-pink-50 text-pink-700" : "text-gray-600 hover:text-pink-700 hover:bg-pink-50"}`
              }
            >
              <FileText size={16} />
              Cotizaciones
            </NavLink>

            <NavLink
              to="/clientes"
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 cursor-pointer
                ${isActive ? "bg-pink-50 text-pink-700" : "text-gray-600 hover:text-pink-700 hover:bg-pink-50"}`
              }
            >
              <Heart size={16} />
              Clientes
            </NavLink>

            <NavLink
              to="/eventos"
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 cursor-pointer
                ${isActive ? "bg-pink-50 text-pink-700" : "text-gray-600 hover:text-pink-700 hover:bg-pink-50"}`
              }
            >
              <Calendar size={16} />
              Eventos
            </NavLink>

            <NavLink
              to="/conductores"
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 cursor-pointer
                ${isActive ? "bg-pink-50 text-pink-700" : "text-gray-600 hover:text-pink-700 hover:bg-pink-50"}`
              }
            >
              <Truck size={16} />
              Conductores
            </NavLink>

            {isAdmin && (
              <>
                <NavLink
                  to="/propietarios"
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 cursor-pointer
                    ${isActive ? "bg-pink-50 text-pink-700" : "text-gray-600 hover:text-pink-700 hover:bg-pink-50"}`
                  }
                >
                  <User size={16} />
                  Propietarios
                </NavLink>

                <NavLink
                  to="/admin/usuarios"
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 cursor-pointer
                    ${isActive ? "bg-pink-50 text-pink-700" : "text-gray-600 hover:text-pink-700 hover:bg-pink-50"}`
                  }
                >
                  <Users size={16} />
                  Usuarios
                </NavLink>
              </>
            )}
          </nav>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-gray-900 leading-tight">{user?.full_name}</div>
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
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
