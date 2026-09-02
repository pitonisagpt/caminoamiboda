import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface EntityLinkProps {
  /** Target route, e.g. `/clientes/editar/${id}`. */
  to: string;
  /** The entity's id — pass whatever the data has, null/undefined (legacy
   * free-text data with no linked record) renders plain text instead. */
  id: number | string | null | undefined;
  children: ReactNode;
  /** For routes gated `adminOnly` in App.tsx (today: only VehicleOwner) —
   * without this, an operations user clicking through gets silently
   * redirected to "/" by ProtectedRoute instead of seeing why. */
  requireAdmin?: boolean;
  className?: string;
}

/**
 * Turns a name that's already being displayed inline (a table cell, a
 * detail field, a card) into a link to that entity's own edit/detail page —
 * distinct from AdminEditLink (a dark "Editar" badge overlaid on public
 * catalog cards): this is a plain inline text link, usable by any role
 * depending on the target entity, meant to sit inside rows/cards that
 * already have their own onClick (hence stopPropagation).
 */
export function EntityLink({ to, id, children, requireAdmin = false, className = "" }: EntityLinkProps) {
  const { isAdmin } = useAuth();
  if (id == null || (requireAdmin && !isAdmin)) {
    return <span className={className}>{children}</span>;
  }
  return (
    <Link
      to={to}
      onClick={(e) => e.stopPropagation()}
      className={`text-brand-600 hover:text-brand-700 hover:underline ${className}`}
    >
      {children}
    </Link>
  );
}

/**
 * A reservation's "driver" slot is either a real Driver record (driver_id)
 * or the vehicle owner acting as their own driver (owner_driver_id, which
 * routes to the admin-only Owner edit page) — resolved once here instead of
 * re-deriving the branch at every call site.
 */
export function DriverLink({
  driverId, ownerDriverId, children, className = "",
}: {
  driverId: number | null | undefined;
  ownerDriverId: number | null | undefined;
  children: ReactNode;
  className?: string;
}) {
  if (driverId) {
    return <EntityLink to={`/conductores/editar/${driverId}`} id={driverId} className={className}>{children}</EntityLink>;
  }
  if (ownerDriverId) {
    return <EntityLink to={`/propietarios/editar/${ownerDriverId}`} id={ownerDriverId} requireAdmin className={className}>{children}</EntityLink>;
  }
  return <span className={className}>{children}</span>;
}
