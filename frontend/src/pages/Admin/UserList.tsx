import { Loader2, Pencil, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usersApi } from "../../api/users";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { useAuth } from "../../context/AuthContext";
import type { AuthUser } from "../../types/auth";

export function UserList() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  useEffect(() => {
    usersApi.list().then((r) => setUsers(r.data)).finally(() => setLoading(false));
  }, []);

  const handleToggleActive = async (u: AuthUser) => {
    setTogglingId(u.id);
    try {
      const res = await usersApi.update(u.id, { is_active: !u.is_active });
      setUsers((prev) => prev.map((x) => (x.id === u.id ? res.data : x)));
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : null;
      alert(msg ?? "Error al actualizar el usuario.");
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-pink-900">Usuarios</h1>
          <p className="text-sm text-gray-500 mt-1">Gestiona el acceso al sistema</p>
        </div>
        <Button onClick={() => navigate("/admin/usuarios/nuevo")}>
          <UserPlus size={16} />
          Nuevo usuario
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20 text-pink-400">
          <Loader2 className="animate-spin" size={28} />
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-pink-100 bg-pink-50/60">
                  {["Nombre", "Correo", "Rol", "Estado", "Acciones"].map((h) => (
                    <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-pink-700 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-pink-50">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-pink-50/40 transition-colors duration-150">
                    <td className="px-6 py-4 font-medium text-gray-900">{u.full_name}</td>
                    <td className="px-6 py-4 text-gray-600">{u.email}</td>
                    <td className="px-6 py-4">
                      <Badge variant={u.role === "admin" ? "pink" : "gray"}>
                        {u.role === "admin" ? "Admin" : "Operaciones"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={u.is_active ? "green" : "red"}>
                        {u.is_active ? "Activo" : "Inactivo"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/admin/usuarios/editar/${u.id}`)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-pink-600 hover:bg-pink-50 transition-colors cursor-pointer"
                          title="Editar"
                        >
                          <Pencil size={15} />
                        </button>
                        {u.id !== currentUser?.id && (
                          <button
                            onClick={() => handleToggleActive(u)}
                            disabled={togglingId === u.id}
                            className={`text-xs px-2 py-1 rounded-lg border transition-colors cursor-pointer disabled:opacity-50
                              ${u.is_active
                                ? "border-red-200 text-red-600 hover:bg-red-50"
                                : "border-green-200 text-green-600 hover:bg-green-50"
                              }`}
                          >
                            {togglingId === u.id ? "..." : u.is_active ? "Desactivar" : "Activar"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
