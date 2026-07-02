import { Loader2, SlidersHorizontal, Star, Users, X } from "lucide-react";
import { useMemo, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import { VehicleCard } from "./VehicleCard";
import { VehicleModal } from "./VehicleModal";
import { AvailabilityWidget } from "./AvailabilityWidget";
import { InstagramGrid } from "./InstagramGrid";
import { reviewsApi, type Review } from "../../api/reviews";
import type { VehicleListItem, VehicleLocation } from "../../types/vehicle";

// ─── Color normalization ───────────────────────────────────────────────────
const COLOR_MAP: Record<string, string> = {
  "Amarillo": "Amarillo", "Amarillo Claro": "Amarillo",
  "Azul y blanco": "Azul",
  "Beige": "Beige", "Beige y negro": "Beige",
  "Blanca y gris": "Blanco", "Blanco": "Blanco",
  "Blanco Almendra": "Blanco", "Blanco y dorado": "Blanco",
  "Negro": "Negro",
  "Rojo": "Rojo",
  "Verde": "Verde", "Verde amarillo": "Verde", "Verde oscuro": "Verde",
};

const COLOR_HEX: Record<string, string> = {
  Amarillo: "#EAB308",
  Azul: "#3B82F6",
  Beige: "#D4B896",
  Blanco: "#F5F5F0",
  Negro: "#1F2937",
  Rojo: "#EF4444",
  Verde: "#22C55E",
};

const COLOR_ORDER = ["Blanco", "Beige", "Amarillo", "Rojo", "Verde", "Azul", "Negro"];

// ─── Static options ────────────────────────────────────────────────────────
const DECADE_OPTIONS = [
  { value: 1920, label: "1920s" },
  { value: 1950, label: "1950s" },
  { value: 1960, label: "1960s" },
  { value: 1970, label: "1970s" },
  { value: 1980, label: "1980s" },
];

const BODY_TYPE_OPTIONS = ["Convertible", "Hardtop", "Semi Descapotable", "Sidecar"];
const CAPACITY_OPTIONS = [2, 3, 4, 5, 8];

const LOCATION_OPTIONS: { value: VehicleLocation; label: string }[] = [
  { value: "medellin", label: "Medellín" },
  { value: "rionegro", label: "Rionegro" },
  { value: "carmen_de_viboral", label: "Carmen de Viboral" },
];

// ─── Types ─────────────────────────────────────────────────────────────────
type SortKey = "default" | "year" | "price_asc" | "price_desc";

interface Filters {
  type: "all" | "car" | "motorcycle";
  brands: string[];
  colors: string[];
  decades: number[];
  bodyTypes: string[];
  capacities: number[];
  locations: string[];
  priceMin: string;
  priceMax: string;
}

const EMPTY_FILTERS: Filters = {
  type: "all",
  brands: [],
  colors: [],
  decades: [],
  bodyTypes: [],
  capacities: [],
  locations: [],
  priceMin: "",
  priceMax: "",
};

// ─── Helpers ───────────────────────────────────────────────────────────────
function canonicalColor(raw: string | null): string | null {
  if (!raw) return null;
  return COLOR_MAP[raw] ?? null;
}

function vehiclePrice(v: VehicleListItem, locations: string[]): number | null {
  if (locations.length === 1 && locations[0] === "rionegro") {
    return v.price_rionegro ?? v.price_medellin ?? null;
  }
  return v.price_medellin ?? v.price_rionegro ?? null;
}

function toggleItem<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item];
}

// ─── FilterSection wrapper ─────────────────────────────────────────────────
function FilterSection({ title, active, children }: { title: string; active: boolean; children: React.ReactNode }) {
  return (
    <div className="py-4 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-1.5 mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{title}</p>
        {active && <span className="w-1.5 h-1.5 rounded-full bg-brand-500 inline-block" />}
      </div>
      {children}
    </div>
  );
}

// ─── Pill button ───────────────────────────────────────────────────────────
function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer border ${
        active
          ? "bg-brand-700 text-white border-brand-700"
          : "bg-white text-gray-600 border-gray-200 hover:border-brand-300 hover:text-brand-600"
      }`}
    >
      {children}
    </button>
  );
}

// ─── FilterPanel ───────────────────────────────────────────────────────────
function FilterPanel({
  filters,
  setFilters,
  availableBrands,
}: {
  filters: Filters;
  setFilters: (f: Filters) => void;
  availableBrands: string[];
}) {
  const set = (patch: Partial<Filters>) => setFilters({ ...filters, ...patch });

  return (
    <div>
      {/* Tipo */}
      <FilterSection title="Tipo" active={filters.type !== "all"}>
        <div className="flex flex-wrap gap-1.5">
          {(["all", "car", "motorcycle"] as const).map(t => (
            <Pill key={t} active={filters.type === t} onClick={() => set({ type: t })}>
              {t === "all" ? "Todos" : t === "car" ? "Carros" : "Motos"}
            </Pill>
          ))}
        </div>
      </FilterSection>

      {/* Marca */}
      <FilterSection title="Marca" active={filters.brands.length > 0}>
        <div className="flex flex-wrap gap-1.5">
          {availableBrands.map(b => (
            <Pill key={b} active={filters.brands.includes(b)} onClick={() => set({ brands: toggleItem(filters.brands, b) })}>
              {b}
            </Pill>
          ))}
        </div>
      </FilterSection>

      {/* Color */}
      <FilterSection title="Color" active={filters.colors.length > 0}>
        <div className="flex flex-wrap gap-2">
          {COLOR_ORDER.map(color => {
            const selected = filters.colors.includes(color);
            const hex = COLOR_HEX[color];
            const isLight = color === "Blanco" || color === "Beige" || color === "Amarillo";
            return (
              <button
                key={color}
                onClick={() => set({ colors: toggleItem(filters.colors, color) })}
                title={color}
                className={`relative w-7 h-7 rounded-full transition-all cursor-pointer ${
                  selected ? "ring-2 ring-brand-400 ring-offset-2" : "ring-1 ring-gray-200 hover:ring-brand-300"
                }`}
                style={{ backgroundColor: hex }}
              >
                {isLight && !selected && (
                  <span className="absolute inset-0 rounded-full border border-gray-300" />
                )}
              </button>
            );
          })}
        </div>
        {filters.colors.length > 0 && (
          <p className="text-[11px] text-gray-400 mt-1.5">{filters.colors.join(", ")}</p>
        )}
      </FilterSection>

      {/* Décadas */}
      <FilterSection title="Década" active={filters.decades.length > 0}>
        <div className="flex flex-wrap gap-1.5">
          {DECADE_OPTIONS.map(d => (
            <Pill key={d.value} active={filters.decades.includes(d.value)} onClick={() => set({ decades: toggleItem(filters.decades, d.value) })}>
              {d.label}
            </Pill>
          ))}
        </div>
      </FilterSection>

      {/* Carrocería */}
      <FilterSection title="Carrocería" active={filters.bodyTypes.length > 0}>
        <div className="flex flex-wrap gap-1.5">
          {BODY_TYPE_OPTIONS.map(bt => (
            <Pill key={bt} active={filters.bodyTypes.includes(bt)} onClick={() => set({ bodyTypes: toggleItem(filters.bodyTypes, bt) })}>
              {bt}
            </Pill>
          ))}
        </div>
      </FilterSection>

      {/* Pasajeros */}
      <FilterSection title="Pasajeros" active={filters.capacities.length > 0}>
        <div className="flex flex-wrap gap-1.5">
          {CAPACITY_OPTIONS.map(c => (
            <Pill key={c} active={filters.capacities.includes(c)} onClick={() => set({ capacities: toggleItem(filters.capacities, c) })}>
              <span className="flex items-center gap-1">
                <Users size={11} />
                {c}
              </span>
            </Pill>
          ))}
        </div>
      </FilterSection>

      {/* Ubicación */}
      <FilterSection title="Ubicación" active={filters.locations.length > 0}>
        <div className="flex flex-wrap gap-1.5">
          {LOCATION_OPTIONS.map(loc => (
            <Pill key={loc.value} active={filters.locations.includes(loc.value)} onClick={() => set({ locations: toggleItem(filters.locations, loc.value) })}>
              {loc.label}
            </Pill>
          ))}
        </div>
      </FilterSection>

      {/* Precio */}
      <FilterSection title="Precio (COP)" active={!!filters.priceMin || !!filters.priceMax}>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Desde"
            value={filters.priceMin}
            onChange={e => set({ priceMin: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <span className="text-gray-300 text-xs shrink-0">–</span>
          <input
            type="number"
            placeholder="Hasta"
            value={filters.priceMax}
            onChange={e => set({ priceMax: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <p className="text-[11px] text-gray-400 mt-1.5">$690.000 – $1.570.000</p>
      </FilterSection>
    </div>
  );
}

// ─── URL helpers for arrays ────────────────────────────────────────────────
const toParam = (arr: (string | number)[]): string | null =>
  arr.length ? arr.map(String).join(",") : null;
const fromParam = (s: string | null): string[] =>
  s ? s.split(",").filter(Boolean) : [];

// ─── Main page ─────────────────────────────────────────────────────────────
export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [vehicles, setVehicles] = useState<VehicleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<VehicleListItem | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);

  // Derive filters from URL — no useState, client-side filtering only
  const filters: Filters = {
    type: (searchParams.get("type") ?? "all") as Filters["type"],
    brands: fromParam(searchParams.get("brands")),
    colors: fromParam(searchParams.get("colors")),
    decades: fromParam(searchParams.get("decades")).map(Number),
    bodyTypes: fromParam(searchParams.get("bodyTypes")),
    capacities: fromParam(searchParams.get("capacities")).map(Number),
    locations: fromParam(searchParams.get("locations")),
    priceMin: searchParams.get("priceMin") ?? "",
    priceMax: searchParams.get("priceMax") ?? "",
  };
  const sort = (searchParams.get("sort") ?? "default") as SortKey;

  function setFilters(f: Filters) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      // type
      if (f.type && f.type !== "all") next.set("type", f.type); else next.delete("type");
      // arrays
      const arrKeys: Array<[keyof Filters, string]> = [
        ["brands", "brands"], ["colors", "colors"], ["decades", "decades"],
        ["bodyTypes", "bodyTypes"], ["capacities", "capacities"], ["locations", "locations"],
      ];
      for (const [fk, pk] of arrKeys) {
        const arr = f[fk] as (string | number)[];
        const v = toParam(arr);
        if (v) next.set(pk, v); else next.delete(pk);
      }
      // price
      if (f.priceMin) next.set("priceMin", f.priceMin); else next.delete("priceMin");
      if (f.priceMax) next.set("priceMax", f.priceMax); else next.delete("priceMax");
      return next;
    }, { replace: true });
  }

  function setSort(s: SortKey) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (s && s !== "default") next.set("sort", s); else next.delete("sort");
      return next;
    }, { replace: true });
  }

  useEffect(() => {
    axios
      .get<VehicleListItem[]>("/api/vehicles")
      .then(res => setVehicles(res.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
    reviewsApi.listPublic().then((r: { data: Review[] }) => setReviews(r.data)).catch(() => {});
  }, []);

  const availableBrands = useMemo(
    () => [...new Set(vehicles.map(v => v.brand).filter(b => b && b !== "Test"))].sort(),
    [vehicles]
  );

  const filtered = useMemo(() => {
    const priceMin = filters.priceMin ? Number(filters.priceMin) : null;
    const priceMax = filters.priceMax ? Number(filters.priceMax) : null;

    return vehicles
      .filter(v => filters.type === "all" || v.vehicle_type === filters.type)
      .filter(v => filters.brands.length === 0 || filters.brands.includes(v.brand))
      .filter(v => {
        if (filters.colors.length === 0) return true;
        const c = canonicalColor(v.color);
        return c !== null && filters.colors.includes(c);
      })
      .filter(v => {
        if (filters.decades.length === 0) return true;
        if (!v.year) return false;
        return filters.decades.includes(Math.floor(v.year / 10) * 10);
      })
      .filter(v => {
        if (filters.bodyTypes.length === 0) return true;
        return v.body_type && filters.bodyTypes.includes(v.body_type);
      })
      .filter(v => {
        if (filters.capacities.length === 0) return true;
        return v.capacity !== null && filters.capacities.includes(v.capacity!);
      })
      .filter(v => {
        if (filters.locations.length === 0) return true;
        return filters.locations.includes(v.location);
      })
      .filter(v => {
        if (priceMin === null && priceMax === null) return true;
        const p = vehiclePrice(v, filters.locations);
        if (p === null) return false;
        if (priceMin !== null && p < priceMin) return false;
        if (priceMax !== null && p > priceMax) return false;
        return true;
      })
      .sort((a, b) => {
        if (sort === "default") return (a.display_order ?? 0) - (b.display_order ?? 0);
        if (sort === "year") return (a.year ?? 0) - (b.year ?? 0);
        const pa = vehiclePrice(a, filters.locations) ?? 0;
        const pb = vehiclePrice(b, filters.locations) ?? 0;
        return sort === "price_asc" ? pa - pb : pb - pa;
      });
  }, [vehicles, filters, sort]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.type !== "all") n++;
    if (filters.brands.length) n++;
    if (filters.colors.length) n++;
    if (filters.decades.length) n++;
    if (filters.bodyTypes.length) n++;
    if (filters.capacities.length) n++;
    if (filters.locations.length) n++;
    if (filters.priceMin || filters.priceMax) n++;
    return n;
  }, [filters]);

  const clearAll = () => setFilters(EMPTY_FILTERS);

  const sidebarContent = (
    <FilterPanel
      filters={filters}
      setFilters={setFilters}
      availableBrands={availableBrands}
    />
  );

  return (
    <>
      <div className="space-y-8">
        {/* Hero */}
        <div className="text-center py-8">
          <h1 className="text-4xl sm:text-5xl font-brand text-brand-500 mb-3">Nuestra Flota</h1>
          <p className="text-gray-500 max-w-xl mx-auto text-sm sm:text-base">
            Vehículos clásicos y especiales para hacer de tu boda un momento inolvidable en Medellín y el Oriente Antioqueño.
          </p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20 text-brand-400">
            <Loader2 className="animate-spin" size={36} />
          </div>
        )}

        {!loading && error && (
          <div className="text-center py-20 text-gray-500">
            <p>No se pudo cargar el catálogo. Intenta más tarde.</p>
          </div>
        )}

        {!loading && !error && (
          <div className="flex gap-8 items-start">
            {/* Sidebar — desktop only */}
            <aside className="hidden md:block w-56 shrink-0 sticky top-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-2">
                <div className="flex items-center justify-between py-3 border-b border-gray-100 mb-1">
                  <p className="text-sm font-semibold text-gray-800">Filtros</p>
                  {activeFilterCount > 0 && (
                    <button
                      onClick={clearAll}
                      className="text-xs text-brand-700 hover:text-brand-800 cursor-pointer"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
                {sidebarContent}
              </div>
            </aside>

            {/* Main content */}
            <div className="flex-1 min-w-0 space-y-4">
              {/* Top bar */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-sm text-gray-400">
                  {filtered.length} vehículo{filtered.length !== 1 ? "s" : ""}
                  {activeFilterCount > 0 && (
                    <button
                      onClick={clearAll}
                      className="ml-2 text-brand-700 hover:text-brand-800 cursor-pointer underline text-xs hidden md:inline"
                    >
                      Limpiar filtros
                    </button>
                  )}
                </p>
                <select
                  value={sort}
                  onChange={e => setSort(e.target.value as SortKey)}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
                >
                  <option value="default">Predeterminado</option>
                  <option value="year">Más antiguo primero</option>
                  <option value="price_asc">Precio: menor a mayor</option>
                  <option value="price_desc">Precio: mayor a menor</option>
                </select>
              </div>

              {/* Empty state */}
              {filtered.length === 0 && (
                <div className="text-center py-16 text-gray-400 space-y-3">
                  <p className="text-lg">No se encontraron vehículos con esos filtros.</p>
                  <button onClick={clearAll} className="text-brand-700 hover:text-brand-800 text-sm underline cursor-pointer">
                    Ver todos los vehículos
                  </button>
                </div>
              )}

              {/* Grid */}
              {filtered.length > 0 && (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                  {filtered.map(v => (
                    <VehicleCard key={v.id} vehicle={v} onClick={() => setSelected(v)} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Mobile floating filter button */}
      {!loading && !error && (
        <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
          <button
            onClick={() => setMobileDrawerOpen(true)}
            className="flex items-center gap-2 bg-brand-500 text-white text-sm font-semibold px-5 py-3 rounded-full shadow-lg hover:bg-brand-600 transition-colors cursor-pointer"
          >
            <SlidersHorizontal size={16} />
            Filtros
            {activeFilterCount > 0 && (
              <span className="bg-white text-brand-700 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Mobile drawer */}
      {mobileDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileDrawerOpen(false)}
          />
          {/* Drawer */}
          <div className="relative bg-white rounded-t-2xl max-h-[85vh] flex flex-col">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <p className="font-semibold text-gray-900">Filtros</p>
              <div className="flex items-center gap-3">
                {activeFilterCount > 0 && (
                  <button onClick={clearAll} className="text-sm text-brand-700 cursor-pointer">
                    Limpiar todo
                  </button>
                )}
                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            {/* Scrollable content */}
            <div className="overflow-y-auto flex-1 px-5">
              {sidebarContent}
            </div>
            {/* Footer CTA */}
            <div className="px-5 py-4 border-t border-gray-100">
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-xl transition-colors cursor-pointer"
              >
                Ver {filtered.length} vehículo{filtered.length !== 1 ? "s" : ""}
              </button>
            </div>
          </div>
        </div>
      )}

      {selected && <VehicleModal vehicle={selected} onClose={() => setSelected(null)} />}

      {/* Reviews section */}
      {reviews.length > 0 && (
        <div className="mt-16 space-y-6">
          <h2 className="text-2xl font-brand text-brand-500 text-center">Lo que dicen nuestros clientes</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {reviews.map(r => (
              <div key={r.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} size={14} className={s <= r.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'} />
                  ))}
                  {r.source === 'google' && (
                    <span className="ml-auto text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">Google</span>
                  )}
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">"{r.body}"</p>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{r.author_name}</p>
                  {r.event_date && (
                    <p className="text-xs text-gray-400">{new Date(r.event_date + 'T12:00:00').toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Availability widget */}
      <div className="mt-16 max-w-lg mx-auto">
        <AvailabilityWidget />
      </div>

      {/* Instagram grid */}
      <div className="mt-16">
        <InstagramGrid />
      </div>
    </>
  );
}
