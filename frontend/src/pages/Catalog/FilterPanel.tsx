import { Users } from "lucide-react";
import {
  COLOR_HEX,
  COLOR_ORDER,
  BODY_TYPE_OPTIONS,
  CATEGORY_OPTIONS,
  CAPACITY_OPTIONS,
  LOCATION_OPTIONS,
  toggleItem,
  FilterSection,
  Pill,
} from "../../components/vehicleFilterKit";
import { useLang } from "../../i18n/LanguageContext";
import { CATEGORY_LABEL_KEY, BODY_TYPE_LABEL_KEY, LOCATION_LABEL_KEY } from "../../i18n/catalogLabels";
import type { Filters } from "./CatalogPage";

export default function FilterPanel({
  filters,
  setFilters,
  availableBrands,
  availableDecades,
  noPricing,
}: {
  filters: Filters;
  setFilters: (f: Filters) => void;
  availableBrands: string[];
  availableDecades: { value: number; label: string }[];
  noPricing?: boolean;
}) {
  const { t } = useLang();
  const set = (patch: Partial<Filters>) => setFilters({ ...filters, ...patch });

  return (
    <div>
      {/* Tipo */}
      <FilterSection title={t("catalog.filterType")} active={filters.type !== "all"}>
        <div className="flex flex-wrap gap-1.5">
          {(["all", "car", "motorcycle"] as const).map(ty => (
            <Pill key={ty} active={filters.type === ty} onClick={() => set({ type: ty })}>
              {ty === "all" ? t("catalog.filterTypeAll") : ty === "car" ? t("catalog.filterTypeCar") : t("catalog.filterTypeMoto")}
            </Pill>
          ))}
        </div>
      </FilterSection>

      {/* Marca */}
      <FilterSection title={t("catalog.filterBrand")} active={filters.brands.length > 0}>
        <div className="flex flex-wrap gap-1.5">
          {availableBrands.map(b => (
            <Pill key={b} active={filters.brands.includes(b)} onClick={() => set({ brands: toggleItem(filters.brands, b) })}>
              {b}
            </Pill>
          ))}
        </div>
      </FilterSection>

      {/* Color */}
      <FilterSection title={t("catalog.filterColor")} active={filters.colors.length > 0}>
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
      <FilterSection title={t("catalog.filterDecade")} active={filters.decades.length > 0}>
        <div className="flex flex-wrap gap-1.5">
          {availableDecades.map(d => (
            <Pill key={d.value} active={filters.decades.includes(d.value)} onClick={() => set({ decades: toggleItem(filters.decades, d.value) })}>
              {d.label}
            </Pill>
          ))}
        </div>
      </FilterSection>

      {/* Carrocería */}
      <FilterSection title={t("catalog.filterBodyType")} active={filters.bodyTypes.length > 0}>
        <div className="flex flex-wrap gap-1.5">
          {BODY_TYPE_OPTIONS.map(bt => (
            <Pill key={bt} active={filters.bodyTypes.includes(bt)} onClick={() => set({ bodyTypes: toggleItem(filters.bodyTypes, bt) })}>
              {BODY_TYPE_LABEL_KEY[bt] ? t(BODY_TYPE_LABEL_KEY[bt]) : bt}
            </Pill>
          ))}
        </div>
      </FilterSection>

      {/* Categoría */}
      <FilterSection title={t("catalog.filterCategory")} active={filters.categories.length > 0}>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORY_OPTIONS.map(c => (
            <Pill key={c.value} active={filters.categories.includes(c.value)} onClick={() => set({ categories: toggleItem(filters.categories, c.value) })}>
              {t(CATEGORY_LABEL_KEY[c.value])}
            </Pill>
          ))}
        </div>
      </FilterSection>

      {/* Pasajeros */}
      <FilterSection title={t("catalog.filterCapacity")} active={filters.capacities.length > 0}>
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
      <FilterSection title={t("catalog.filterLocation")} active={filters.locations.length > 0}>
        <div className="flex flex-wrap gap-1.5">
          {LOCATION_OPTIONS.map(loc => (
            <Pill key={loc.value} active={filters.locations.includes(loc.value)} onClick={() => set({ locations: toggleItem(filters.locations, loc.value) })}>
              {t(LOCATION_LABEL_KEY[loc.value])}
            </Pill>
          ))}
        </div>
      </FilterSection>

      {/* Precio — sin sentido en el catálogo de producciones/activaciones,
          que se cotiza aparte por hora */}
      {!noPricing && (
        <FilterSection title={t("catalog.filterPrice")} active={!!filters.priceMin || !!filters.priceMax}>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder={t("catalog.priceFromPlaceholder")}
              value={filters.priceMin}
              onChange={e => set({ priceMin: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <span className="text-gray-300 text-xs shrink-0">–</span>
            <input
              type="number"
              placeholder={t("catalog.priceToPlaceholder")}
              value={filters.priceMax}
              onChange={e => set({ priceMax: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <p className="text-[11px] text-gray-400 mt-1.5">$690.000 – $1.570.000</p>
        </FilterSection>
      )}
    </div>
  );
}
