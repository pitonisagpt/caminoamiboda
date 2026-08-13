import { useEffect, useState } from "react";
import { Car } from "lucide-react";
import { vehiclesApi } from "../../api/vehicles";
import type { PublicVehicleListItem } from "../../types/vehicle";

// Shared across every chip instance in the widget so we fetch the public
// vehicle list at most once per page load, regardless of how many
// [VEHICLE:id] tags appear across the conversation.
let vehiclesPromise: Promise<PublicVehicleListItem[]> | null = null;
function loadVehicles(): Promise<PublicVehicleListItem[]> {
  if (!vehiclesPromise) {
    vehiclesPromise = vehiclesApi.list().then(res => res.data);
  }
  return vehiclesPromise;
}

const CATEGORY_LABEL: Record<string, string> = {
  clasico: "Clásico",
  vintage: "Vintage",
  moderno: "Moderno",
};

export function VehicleChip({ id }: { id: number }) {
  const [vehicle, setVehicle] = useState<PublicVehicleListItem | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    loadVehicles()
      .then(list => {
        if (!cancelled) setVehicle(list.find(v => v.id === id) ?? null);
      })
      .catch(() => {
        if (!cancelled) setVehicle(null);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Still loading, not found, or deactivated since the reply was generated —
  // render nothing rather than a broken-looking chip.
  if (!vehicle) return null;

  const photo = vehicle.photos.find(p => p.is_visible) ?? vehicle.photos[0];

  return (
    <a
      href={`/catalogo?vehiculo=${vehicle.id}`}
      className="flex items-center gap-2 bg-white border border-brand-100 rounded-lg px-2.5 py-2 mt-1.5 hover:border-brand-300 hover:shadow-sm transition-all"
    >
      {photo ? (
        <img src={photo.url} alt={vehicle.brand} className="w-10 h-10 rounded-md object-cover shrink-0" />
      ) : (
        <div className="w-10 h-10 rounded-md bg-brand-50 text-brand-400 flex items-center justify-center shrink-0">
          <Car size={18} />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs font-semibold text-gray-900 truncate">
          {vehicle.brand} {vehicle.model_line ?? ""}
        </p>
        <p className="text-[11px] text-gray-500">
          {vehicle.category ? CATEGORY_LABEL[vehicle.category] : ""} · Ver detalles
        </p>
      </div>
    </a>
  );
}
