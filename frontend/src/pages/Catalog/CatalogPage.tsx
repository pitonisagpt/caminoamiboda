import { Loader2, Search } from "lucide-react";
import { useEffect, useState } from "react";
import axios from "axios";
import { VehicleCard } from "./VehicleCard";
import type { VehicleListItem, VehicleLocation, VehicleType } from "../../types/vehicle";

type SortKey = "score" | "year";

const LOCATION_LABEL: Record<VehicleLocation, string> = {
  medellin: "Medellín",
  rionegro: "Rionegro",
  carmen_de_viboral: "Carmen de Viboral",
};

export function CatalogPage() {
  const [vehicles, setVehicles] = useState<VehicleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [typeFilter, setTypeFilter] = useState<VehicleType | "all">("all");
  const [locationFilter, setLocationFilter] = useState<VehicleLocation | "all">("all");
  const [sort, setSort] = useState<SortKey>("score");
  const [search, setSearch] = useState("");

  useEffect(() => {
    axios
      .get<VehicleListItem[]>("/api/vehicles")
      .then((res) => setVehicles(res.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const filtered = vehicles
    .filter((v) => typeFilter === "all" || v.vehicle_type === typeFilter)
    .filter((v) => locationFilter === "all" || v.location === locationFilter)
    .filter((v) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        v.brand.toLowerCase().includes(q) ||
        (v.model_line ?? "").toLowerCase().includes(q) ||
        (v.color ?? "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sort === "score") return (b.score_total ?? 0) - (a.score_total ?? 0);
      return (b.year ?? 0) - (a.year ?? 0);
    });

  const typeBtn = (val: typeof typeFilter, label: string) => (
    <button
      key={val}
      onClick={() => setTypeFilter(val)}
      className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
        typeFilter === val
          ? "bg-pink-600 text-white"
          : "bg-white text-gray-600 border border-gray-200 hover:border-pink-300 hover:text-pink-700"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="text-center py-8">
        <h1 className="text-4xl sm:text-5xl font-brand text-pink-600 mb-3">Nuestra Flota</h1>
        <p className="text-gray-500 max-w-xl mx-auto text-sm sm:text-base">
          Vehículos clásicos y especiales para hacer de tu boda un momento inolvidable en Medellín y el Oriente Antioqueño.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {typeBtn("all", "Todos")}
          {typeBtn("car", "Carros")}
          {typeBtn("motorcycle", "Motos")}
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value as typeof locationFilter)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-300 cursor-pointer"
          >
            <option value="all">Todas las ubicaciones</option>
            {(["medellin", "rionegro", "carmen_de_viboral"] as VehicleLocation[]).map((loc) => (
              <option key={loc} value={loc}>{LOCATION_LABEL[loc]}</option>
            ))}
          </select>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-300 cursor-pointer"
          >
            <option value="score">Por puntuación</option>
            <option value="year">Por año</option>
          </select>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="text-sm border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-300 w-36"
            />
          </div>
        </div>
      </div>

      {/* States */}
      {loading && (
        <div className="flex items-center justify-center py-20 text-pink-400">
          <Loader2 className="animate-spin" size={36} />
        </div>
      )}

      {!loading && error && (
        <div className="text-center py-20 text-gray-500">
          <p>No se pudo cargar el catálogo. Intenta más tarde.</p>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">No se encontraron vehículos con esos filtros.</p>
        </div>
      )}

      {/* Grid */}
      {!loading && filtered.length > 0 && (
        <>
          <p className="text-xs text-gray-400">{filtered.length} vehículo{filtered.length !== 1 ? "s" : ""}</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            {filtered.map((v) => (
              <VehicleCard key={v.id} vehicle={v} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
