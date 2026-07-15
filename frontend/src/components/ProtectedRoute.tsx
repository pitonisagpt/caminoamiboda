import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

export function ProtectedRoute({ children, adminOnly = false }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-50 flex items-center justify-center">
        <div className="text-brand-400 text-sm">Cargando...</div>
      </div>
    );
  }

  if (!user) {
    // "/" is also the admin dashboard's index route (same path, different
    // audience) — an anonymous visitor to the bare domain should land on
    // the public site, not the admin login screen.
    if (location.pathname === "/") return <Navigate to="/catalogo" replace />;
    return <Navigate to="/login" replace />;
  }
  if (adminOnly && user.role !== "admin") return <Navigate to="/" replace />;

  return <>{children}</>;
}
