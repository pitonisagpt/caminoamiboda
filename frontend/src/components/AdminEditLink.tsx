import { Link } from "react-router-dom";
import { Pencil } from "lucide-react";
import { useAuth } from "../context/AuthContext";

/** Admin-only "editar" shortcut shown on public pages, jumping straight to
 * the matching admin edit view. Renders nothing for non-admins/anonymous
 * visitors. Dark/neutral styling on purpose — distinct from the brand-colored
 * badges customers see, so it reads as a staff control, not catalog content. */
export function AdminEditLink({
  to,
  label = "Editar",
  className = "",
}: {
  to: string;
  label?: string;
  className?: string;
}) {
  const { isAdmin } = useAuth();
  if (!isAdmin) return null;
  return (
    <Link
      to={to}
      onClick={(e) => e.stopPropagation()}
      className={`inline-flex items-center gap-1 bg-gray-900/80 hover:bg-gray-900 text-white text-xs font-medium px-2 py-1 rounded-full shadow-sm backdrop-blur-sm transition-colors ${className}`}
    >
      <Pencil size={11} />
      {label}
    </Link>
  );
}
