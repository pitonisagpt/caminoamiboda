import { Users } from "lucide-react";
import type { VehicleListItem, VehicleLocation } from "../types/vehicle";

// ─── Color normalization ───────────────────────────────────────────────────
export const COLOR_MAP: Record<string, string> = {
  "Amarillo": "Amarillo", "Amarillo Claro": "Amarillo",
  "Azul y blanco": "Azul",
  "Beige": "Beige", "Beige y negro": "Beige",
  "Blanca y gris": "Blanco", "Blanco": "Blanco",
  "Blanco Almendra": "Blanco", "Blanco y dorado": "Blanco",
  "Negro": "Negro",
  "Rojo": "Rojo",
  "Verde": "Verde", "Verde amarillo": "Verde", "Verde oscuro": "Verde",
};

export const COLOR_HEX: Record<string, string> = {
  Amarillo: "#EAB308",
  Azul: "#3B82F6",
  Beige: "#D4B896",
  Blanco: "#F5F5F0",
  Negro: "#1F2937",
  Rojo: "#EF4444",
  Verde: "#22C55E",
};

export const COLOR_ORDER = ["Blanco", "Beige", "Amarillo", "Rojo", "Verde", "Azul", "Negro"];

// ─── Static options ────────────────────────────────────────────────────────
export const DECADE_OPTIONS = [
  { value: 1920, label: "1920s" },
  { value: 1950, label: "1950s" },
  { value: 1960, label: "1960s" },
  { value: 1970, label: "1970s" },
  { value: 1980, label: "1980s" },
];

export const BODY_TYPE_OPTIONS = ["Convertible", "Hardtop", "Semi Descapotable", "Sidecar"];
export const CAPACITY_OPTIONS = [2, 3, 4, 5, 8];

export const LOCATION_OPTIONS: { value: VehicleLocation; label: string }[] = [
  { value: "medellin", label: "Medellín" },
  { value: "rionegro", label: "Rionegro" },
  { value: "carmen_de_viboral", label: "Carmen de Viboral" },
];

// ─── Helpers ───────────────────────────────────────────────────────────────
export function canonicalColor(raw: string | null): string | null {
  if (!raw) return null;
  return COLOR_MAP[raw] ?? null;
}

export function vehiclePrice(v: VehicleListItem, locations: string[]): number | null {
  if (locations.length === 1 && locations[0] === "rionegro") {
    return v.price_rionegro ?? v.price_medellin ?? null;
  }
  return v.price_medellin ?? v.price_rionegro ?? null;
}

export function toggleItem<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item];
}

// ─── FilterSection wrapper ─────────────────────────────────────────────────
export function FilterSection({ title, active, children }: { title: string; active: boolean; children: React.ReactNode }) {
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
export function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
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

// Re-exported for consumers that want the capacity Pill's people icon without importing lucide directly.
export { Users as CapacityIcon };
