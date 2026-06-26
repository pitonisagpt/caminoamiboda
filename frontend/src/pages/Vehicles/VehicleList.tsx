import { BarChart2, Car, ChevronUp, ChevronDown, Edit, Loader2, MessageCircle, Plus, PowerOff, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { vehiclesApi } from "../../api/vehicles";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import type { VehicleListItem, VehicleStatus } from "../../types/vehicle";

const STATUS_LABEL: Record<VehicleStatus, string> = {
  active: "Activo",
  inactive: "Inactivo",
  pending: "Pendiente",
};
const STATUS_VARIANT: Record<VehicleStatus, "green" | "gray" | "blue"> = {
  active: "green",
  inactive: "gray",
  pending: "blue",
};

const LOCATION_LABEL: Record<string, string> = {
  medellin: "Medellín",
  rionegro: "Rionegro",
  carmen_de_viboral: "Carmen de Viboral",
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatDateES(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-CO", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

function toWhatsAppUrl(phone: string, message: string): string {
  // Strip trailing .0 from Excel-sourced floats (e.g. "3127986558.0" → "3127986558")
  const cleaned = phone.replace(/\.0*$/, "").trim();
  const digits = cleaned.replace(/\D/g, "");
  const normalized = digits.startsWith("57") ? digits : `57${digits}`;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

const DAY_COLOR: Record<string, string> = {
  Lunes: "bg-blue-100 text-blue-700",
  Martes: "bg-purple-100 text-purple-700",
  Miércoles: "bg-yellow-100 text-yellow-700",
  Jueves: "bg-orange-100 text-orange-700",
  Viernes: "bg-green-100 text-green-700",
};

function ScoreBar({ total }: { total: number | null }) {
  if (total === null) return <span className="text-gray-400 text-xs">—</span>;
  const pct = (total / 25) * 100;
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-pink-400 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono text-gray-700">{total}/25</span>
    </div>
  );
}

type SortKey = "license_plate" | "brand" | "year" | "color" | "status" | "score_total";
type SortDir = "asc" | "desc";

function vehiclePhoto(v: VehicleListItem): string | null {
  if (!v.photos?.length) return null;
  const visible = v.photos.find(p => p.is_visible) ?? v.photos[0];
  return visible ? `/api/uploads/vehicles/${visible.file_name}` : null;
}

export function VehicleList() {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<VehicleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deactivating, setDeactivating] = useState<number | null>(null);
  const [waVehicle, setWaVehicle] = useState<VehicleListItem | null>(null);
  const [waDate, setWaDate] = useState(todayISO());
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("brand");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const fetchVehicles = async () => {
    try {
      const res = await vehiclesApi.listAll();
      setVehicles(res.data);
    } catch {
      setError("Error al cargar los vehículos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchVehicles(); }, []);

  const displayed = useMemo(() => {
    const q = search.toLowerCase();
    const filtered = q
      ? vehicles.filter(v =>
          [v.license_plate, v.brand, v.model_line, v.color, v.year?.toString()]
            .some(f => f?.toLowerCase().includes(q))
        )
      : vehicles;

    return [...filtered].sort((a, b) => {
      let av: string | number | null = null;
      let bv: string | number | null = null;
      if (sortKey === "score_total") { av = a.score_total; bv = b.score_total; }
      else if (sortKey === "year")   { av = a.year;        bv = b.year; }
      else                           { av = (a as any)[sortKey] ?? ""; bv = (b as any)[sortKey] ?? ""; }

      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [vehicles, search, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const handleDeactivate = async (v: VehicleListItem) => {
    if (!confirm(`¿Desactivar el vehículo ${v.license_plate}?`)) return;
    setDeactivating(v.id);
    try {
      await vehiclesApi.deactivate(v.id);
      await fetchVehicles();
    } catch {
      alert("Error al desactivar el vehículo.");
    } finally {
      setDeactivating(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-pink-900">Vehículos</h1>
          <p className="text-sm text-gray-500 mt-1">Flota de Camino a mi Boda</p>
        </div>
        <Button onClick={() => navigate("/vehiculos/nuevo")} size="lg">
          <Plus size={18} />
          Nuevo vehículo
        </Button>
      </div>

      {/* Search bar */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por placa, marca, color…"
          className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-300"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer">
            <X size={13} />
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20 text-pink-400">
          <Loader2 className="animate-spin" size={32} />
        </div>
      )}

      {!loading && !error && vehicles.length === 0 && (
        <Card>
          <div className="text-center py-16 px-6">
            <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Car size={28} className="text-pink-500" />
            </div>
            <h3 className="text-lg font-semibold text-pink-900 mb-2">No hay vehículos registrados</h3>
            <Button onClick={() => navigate("/vehiculos/nuevo")}>
              <Plus size={16} />
              Agregar vehículo
            </Button>
          </div>
        </Card>
      )}

      {/* WhatsApp date popover */}
      {waVehicle && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setWaVehicle(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <MessageCircle size={20} className="text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 leading-tight">
                  {waVehicle.brand}{waVehicle.model_line ? ` ${waVehicle.model_line}` : ""}
                </p>
                <p className="text-xs text-gray-400 font-mono">{waVehicle.license_plate}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-pink-900">Fecha del evento</label>
              <input
                type="date"
                value={waDate}
                onChange={(e) => setWaDate(e.target.value)}
                className="w-full rounded-lg border border-pink-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500 cursor-pointer"
              />
              {waDate && (
                <p className="text-xs text-gray-400 capitalize">{formatDateES(waDate)}</p>
              )}
            </div>

            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 leading-relaxed">
              <span className="font-medium text-gray-700">Mensaje:</span><br />
              Hola! Te escribo de Camino a mi Boda. ¿Está disponible el {waVehicle.brand}
              {waVehicle.model_line ? ` ${waVehicle.model_line}` : ""} ({waVehicle.license_plate}) para el{" "}
              <span className="capitalize">{waDate ? formatDateES(waDate) : "…"}</span>?
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setWaVehicle(null)}
                className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <a
                href={toWhatsAppUrl(
                  waVehicle.owner_contact!,
                  `Hola! Te escribo de Camino a mi Boda. ¿Está disponible el ${waVehicle.brand}${waVehicle.model_line ? ` ${waVehicle.model_line}` : ""} (${waVehicle.license_plate}) para el ${formatDateES(waDate)}?`
                )}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setWaVehicle(null)}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Abrir WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}

      {!loading && vehicles.length > 0 && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-pink-100 bg-pink-50/60">
                  {/* Photo — not sortable */}
                  <th className="pl-4 pr-2 py-3 w-12" />
                  {(
                    [
                      { label: "Placa",       key: "license_plate" as SortKey },
                      { label: "Marca / Línea", key: "brand" as SortKey },
                      { label: "Año",         key: "year" as SortKey },
                      { label: "Color",       key: "color" as SortKey },
                      { label: "Ubicación",   key: null },
                      { label: "Estado",      key: "status" as SortKey },
                      { label: "Score",       key: "score_total" as SortKey },
                      { label: "Pico y Placa", key: null },
                    ] as { label: string; key: SortKey | null }[]
                  ).map(({ label, key }) => (
                    <th
                      key={label}
                      onClick={key ? () => toggleSort(key) : undefined}
                      className={`text-left px-4 py-3 text-xs font-semibold text-pink-700 uppercase tracking-wider select-none ${key ? "cursor-pointer hover:text-pink-900" : ""}`}
                    >
                      <span className="inline-flex items-center gap-1">
                        {label}
                        {key && sortKey === key && (
                          sortDir === "asc"
                            ? <ChevronUp size={12} className="text-pink-500" />
                            : <ChevronDown size={12} className="text-pink-500" />
                        )}
                      </span>
                    </th>
                  ))}
                  <th className="pr-6 py-3 text-right text-xs font-semibold text-pink-700 uppercase tracking-wider" />
                </tr>
              </thead>
              <tbody className="divide-y divide-pink-50">
                {displayed.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-10 text-center text-sm text-gray-400">
                      No hay vehículos que coincidan con "{search}"
                    </td>
                  </tr>
                ) : displayed.map((v) => {
                  const photo = vehiclePhoto(v);
                  return (
                    <tr key={v.id} className="hover:bg-pink-50/40 transition-colors duration-150">
                      {/* Photo / avatar */}
                      <td className="pl-4 pr-2 py-2">
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0">
                          {photo
                            ? <img src={photo} alt={v.brand} className="w-full h-full object-cover" loading="lazy" />
                            : <Car size={16} className="text-gray-300" />
                          }
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-pink-700 font-semibold text-xs tracking-wide">{v.license_plate}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{v.brand}</div>
                        {v.model_line && <div className="text-xs text-gray-500">{v.model_line}</div>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{v.year ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-700">{v.color ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-700">{LOCATION_LABEL[v.location] ?? v.location}</td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_VARIANT[v.status]}>{STATUS_LABEL[v.status]}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <ScoreBar total={v.score_total} />
                      </td>
                      <td className="px-4 py-3">
                        {v.pico_y_placa_day ? (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${DAY_COLOR[v.pico_y_placa_day] ?? "bg-gray-100 text-gray-700"}`}>
                            {v.pico_y_placa_day}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {v.owner_contact && (
                            <button
                              onClick={() => { setWaVehicle(v); setWaDate(todayISO()); }}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors cursor-pointer"
                              title="Consultar disponibilidad por WhatsApp"
                            >
                              <MessageCircle size={15} />
                            </button>
                          )}
                          <button
                            onClick={() => navigate(`/vehiculos/${v.id}/estadisticas`)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors cursor-pointer"
                            title="Estadísticas"
                          >
                            <BarChart2 size={15} />
                          </button>
                          <button
                            onClick={() => navigate(`/vehiculos/editar/${v.id}`)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-pink-600 hover:bg-pink-50 transition-colors cursor-pointer"
                            title="Editar"
                          >
                            <Edit size={15} />
                          </button>
                          <button
                            onClick={() => handleDeactivate(v)}
                            disabled={deactivating === v.id || v.status === "inactive"}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Desactivar"
                          >
                            {deactivating === v.id ? <Loader2 size={15} className="animate-spin" /> : <PowerOff size={15} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {search && displayed.length > 0 && (
            <p className="px-6 py-2 text-xs text-gray-400 border-t border-pink-50">
              {displayed.length} de {vehicles.length} vehículos
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
