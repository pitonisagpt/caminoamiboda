import { Loader2, MessageCircle, Pencil, Plus, Truck, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { driversApi } from "../../api/drivers";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import type { Driver } from "../../types/driver";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function licenseExpiredSoon(iso: string | null): boolean {
  if (!iso) return false;
  const exp = new Date(iso);
  const threshold = new Date();
  threshold.setDate(threshold.getDate() + 60);
  return exp <= threshold;
}

function toWhatsAppUrl(phone: string | null, name: string): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  const num = digits.startsWith("57") ? digits : `57${digits}`;
  const msg = encodeURIComponent(`Hola ${name}, soy de Camino a mi Boda.`);
  return `https://wa.me/${num}?text=${msg}`;
}

export function DriverList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const filter = (searchParams.get('status') ?? 'active') as "all" | "active" | "inactive";
  const [deletingId, setDeletingId] = useState<number | null>(null);

  function setFilter(value: "all" | "active" | "inactive") {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      // 'active' is the default — omit from URL to keep it clean
      if (value && value !== 'active') next.set('status', value); else next.delete('status');
      return next;
    }, { replace: true });
  }

  useEffect(() => {
    setLoading(true);
    driversApi.list(filter === "all" ? {} : { status: filter })
      .then((r) => setDrivers(r.data))
      .finally(() => setLoading(false));
  }, [filter]);

  const handleDelete = async (d: Driver) => {
    if (!confirm(`¿Eliminar a ${d.full_name}?`)) return;
    setDeletingId(d.id);
    try {
      await driversApi.delete(d.id);
      setDrivers((prev) => prev.filter((x) => x.id !== d.id));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-800">Conductores</h1>
          <p className="text-sm text-gray-500 mt-0.5">{drivers.length} conductor{drivers.length !== 1 ? "es" : ""}</p>
        </div>
        <Button onClick={() => navigate("/conductores/nuevo")} className="flex items-center gap-2 w-fit">
          <Plus size={16} /> Nuevo conductor
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(["active", "inactive", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              filter === f ? "bg-brand-500 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-brand-50"
            }`}
          >
            {f === "active" ? "Activos" : f === "inactive" ? "Inactivos" : "Todos"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-brand-400"><Loader2 className="animate-spin" size={28} /></div>
      ) : drivers.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Truck size={40} className="mx-auto mb-3 text-brand-200" />
          <p>No hay conductores.</p>
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
                  <th className="text-left px-4 py-3 font-semibold text-brand-600">Licencia</th>
                  <th className="text-left px-4 py-3 font-semibold text-brand-600">Vence</th>
                  <th className="text-left px-4 py-3 font-semibold text-brand-600">Estado</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {drivers.map((d) => {
                  const expiredSoon = licenseExpiredSoon(d.license_expiration_date);
                  return (
                    <tr key={d.id} className="border-b border-gray-50 hover:bg-brand-50/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{d.full_name}</td>
                      <td className="px-4 py-3 text-gray-500">{d.identification_number ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-600">{d.phone ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-600 font-mono text-xs">{d.driver_license_number ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className={expiredSoon ? "text-red-500 font-semibold" : "text-gray-600"}>
                          {formatDate(d.license_expiration_date)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={d.status === "active" ? "pink" : "gray"}>
                          {d.status === "active" ? "Activo" : "Inactivo"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          {(d.whatsapp || d.phone) && (
                            <a
                              href={toWhatsAppUrl(d.whatsapp ?? d.phone, d.full_name)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 rounded-lg text-green-500 hover:bg-green-50 transition-colors cursor-pointer"
                              title="WhatsApp"
                            >
                              <MessageCircle size={15} />
                            </a>
                          )}
                          <button
                            onClick={() => navigate(`/conductores/editar/${d.id}`)}
                            className="p-2 rounded-lg text-gray-400 hover:text-brand-500 hover:bg-brand-50 transition-colors cursor-pointer"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(d)}
                            disabled={deletingId === d.id}
                            className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-40"
                          >
                            {deletingId === d.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
