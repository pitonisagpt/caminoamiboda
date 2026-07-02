import { Loader2, MessageCircle, Pencil, Plus, Trash2, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { vehicleOwnersApi } from "../../api/vehicleOwners";
import { Button } from "../../components/ui/Button";
import type { VehicleOwner } from "../../types/vehicleOwner";

function toWhatsAppUrl(phone: string | null, name: string): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  const num = digits.startsWith("57") ? digits : `57${digits}`;
  const msg = encodeURIComponent(`Hola ${name}, soy de Camino a mi Boda.`);
  return `https://wa.me/${num}?text=${msg}`;
}

export function OwnerList() {
  const navigate = useNavigate();
  const [owners, setOwners] = useState<VehicleOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    vehicleOwnersApi.list().then((r) => setOwners(r.data)).finally(() => setLoading(false));
  }, []);

  const handleDelete = async (o: VehicleOwner) => {
    if (!confirm(`¿Eliminar a ${o.full_name}?`)) return;
    setDeletingId(o.id);
    try {
      await vehicleOwnersApi.delete(o.id);
      setOwners((prev) => prev.filter((x) => x.id !== o.id));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-800">Propietarios de vehículos</h1>
          <p className="text-sm text-gray-500 mt-0.5">{owners.length} propietario{owners.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => navigate("/propietarios/nuevo")} className="flex items-center gap-2 w-fit">
          <Plus size={16} /> Nuevo propietario
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-brand-400"><Loader2 className="animate-spin" size={28} /></div>
      ) : owners.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <User size={40} className="mx-auto mb-3 text-brand-200" />
          <p>No hay propietarios registrados.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-brand-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-50 bg-brand-50/50">
                  <th className="text-left px-4 py-3 font-semibold text-brand-600">Nombre</th>
                  <th className="text-left px-4 py-3 font-semibold text-brand-600">Identificación</th>
                  <th className="text-left px-4 py-3 font-semibold text-brand-600">Teléfono</th>
                  <th className="text-left px-4 py-3 font-semibold text-brand-600">Email</th>
                  <th className="text-left px-4 py-3 font-semibold text-brand-600">Banco</th>
                  <th className="text-left px-4 py-3 font-semibold text-brand-600">Cuenta</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {owners.map((o) => (
                  <tr key={o.id} className="border-b border-gray-50 hover:bg-brand-50/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{o.full_name}</td>
                    <td className="px-4 py-3 text-gray-500">{o.identification_number ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{o.phone ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{o.email ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{o.bank_name ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {o.account_type && o.account_number ? `${o.account_type} · ${o.account_number}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        {(o.whatsapp || o.phone) && (
                          <a
                            href={toWhatsAppUrl(o.whatsapp ?? o.phone, o.full_name)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg text-green-500 hover:bg-green-50 transition-colors cursor-pointer"
                            title="WhatsApp"
                          >
                            <MessageCircle size={15} />
                          </a>
                        )}
                        <button
                          onClick={() => navigate(`/propietarios/editar/${o.id}`)}
                          className="p-2 rounded-lg text-gray-400 hover:text-brand-500 hover:bg-brand-50 transition-colors cursor-pointer"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(o)}
                          disabled={deletingId === o.id}
                          className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-40"
                        >
                          {deletingId === o.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
