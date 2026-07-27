import { ChevronDown, ChevronUp, ChevronsUpDown, Loader2, MessageCircle, Pencil, Plus, Search, Trash2, User } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { vehicleOwnersApi } from "../../api/vehicleOwners";
import { vehiclesApi } from "../../api/vehicles";
import { Button } from "../../components/ui/Button";
import type { VehicleOwner } from "../../types/vehicleOwner";

function toWhatsAppUrl(phone: string | null, name: string): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  const num = digits.startsWith("57") ? digits : `57${digits}`;
  const msg = encodeURIComponent(`Hola ${name}, soy de Camino a mi Boda.`);
  return `https://wa.me/${num}?text=${msg}`;
}

type SortKey = "full_name" | "identification_number" | "phone" | "vehicle_count";

function SortIcon({ col, current, dir }: { col: SortKey; current: SortKey; dir: "asc" | "desc" }) {
  if (col !== current) return <ChevronsUpDown className="w-3.5 h-3.5 text-gray-300 inline ml-1" />;
  return dir === "asc"
    ? <ChevronUp className="w-3.5 h-3.5 text-brand-500 inline ml-1" />
    : <ChevronDown className="w-3.5 h-3.5 text-brand-500 inline ml-1" />;
}

export function OwnerList() {
  const navigate = useNavigate();
  const [owners, setOwners] = useState<VehicleOwner[]>([]);
  const [vehicleCounts, setVehicleCounts] = useState<Map<number, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("full_name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    Promise.all([vehicleOwnersApi.list(), vehiclesApi.listAll()])
      .then(([ownersRes, vehiclesRes]) => {
        setOwners(ownersRes.data);
        const counts = new Map<number, number>();
        for (const v of vehiclesRes.data) {
          if (!v.owner_id) continue;
          counts.set(v.owner_id, (counts.get(v.owner_id) ?? 0) + 1);
        }
        setVehicleCounts(counts);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const visibleOwners = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? owners.filter((o) =>
          [o.full_name, o.identification_number, o.phone, o.email]
            .filter(Boolean)
            .some((v) => v!.toLowerCase().includes(q))
        )
      : owners;

    const dirMul = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sortKey === "vehicle_count") {
        const av = vehicleCounts.get(a.id) ?? 0;
        const bv = vehicleCounts.get(b.id) ?? 0;
        return (av - bv) * dirMul;
      }
      const av = (a[sortKey] ?? "").toString().toLowerCase();
      const bv = (b[sortKey] ?? "").toString().toLowerCase();
      return av.localeCompare(bv) * dirMul;
    });
  }, [owners, query, sortKey, sortDir, vehicleCounts]);

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
          <p className="text-sm text-gray-500 mt-0.5">
            {visibleOwners.length} de {owners.length} propietario{owners.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => navigate("/propietarios/nuevo")} className="flex items-center gap-2 w-fit">
          <Plus size={16} /> Nuevo propietario
        </Button>
      </div>

      {!loading && owners.length > 0 && (
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, cédula, teléfono o email..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16 text-brand-400"><Loader2 className="animate-spin" size={28} /></div>
      ) : owners.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <User size={40} className="mx-auto mb-3 text-brand-200" />
          <p>No hay propietarios registrados.</p>
        </div>
      ) : visibleOwners.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Search size={40} className="mx-auto mb-3 text-brand-200" />
          <p>Ningún propietario coincide con "{query}".</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-brand-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-50 bg-brand-50/50">
                  <th className="text-left px-4 py-3 font-semibold text-brand-600 cursor-pointer select-none" onClick={() => handleSort("full_name")}>
                    Nombre <SortIcon col="full_name" current={sortKey} dir={sortDir} />
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-brand-600 cursor-pointer select-none" onClick={() => handleSort("identification_number")}>
                    Identificación <SortIcon col="identification_number" current={sortKey} dir={sortDir} />
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-brand-600 cursor-pointer select-none" onClick={() => handleSort("phone")}>
                    Teléfono <SortIcon col="phone" current={sortKey} dir={sortDir} />
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-brand-600">Email</th>
                  <th className="text-left px-4 py-3 font-semibold text-brand-600">Banco</th>
                  <th className="text-left px-4 py-3 font-semibold text-brand-600">Cuenta</th>
                  <th className="text-left px-4 py-3 font-semibold text-brand-600 cursor-pointer select-none" onClick={() => handleSort("vehicle_count")}>
                    Autos <SortIcon col="vehicle_count" current={sortKey} dir={sortDir} />
                  </th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {visibleOwners.map((o) => (
                  <tr key={o.id} className="border-b border-gray-50 hover:bg-brand-50/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{o.full_name}</td>
                    <td className="px-4 py-3 text-gray-500">{o.identification_number ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{o.phone ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{o.email ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{o.bank_name ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {o.account_type && o.account_number ? `${o.account_type} · ${o.account_number}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-medium">
                      {(vehicleCounts.get(o.id) ?? 0) > 0 ? (
                        <Link
                          to={`/vehiculos?q=${encodeURIComponent(o.full_name)}`}
                          className="text-brand-600 hover:text-brand-700 hover:underline"
                        >
                          {vehicleCounts.get(o.id)}
                        </Link>
                      ) : (
                        vehicleCounts.get(o.id) ?? 0
                      )}
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
