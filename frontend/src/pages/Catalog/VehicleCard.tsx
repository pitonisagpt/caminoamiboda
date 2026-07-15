import type { VehicleListItem } from "../../types/vehicle";
import { PhotoSlider } from "./PhotoSlider";

const WHATSAPP_NUMBER = "573147372030";
const PICO_HOURS = "6:00–8:30 AM  |  5:00–7:30 PM";

const DAY_COLOR: Record<string, string> = {
  Lunes: "bg-blue-100 text-blue-700",
  Martes: "bg-purple-100 text-purple-700",
  Miércoles: "bg-yellow-100 text-yellow-700",
  Jueves: "bg-orange-100 text-orange-700",
  Viernes: "bg-green-100 text-green-700",
};

const SCORE_LABELS = ["Elegancia", "Exclusividad", "Fotogenia", "Comodidad", "Romanticismo"];

function ScoreDot({ value, label }: { value: number | null; label: string }) {
  const filled = value ?? 0;
  return (
    <div className="flex flex-col items-center gap-1" title={`${label}: ${value ?? "—"}/5`}>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`w-1.5 h-1.5 rounded-full ${i <= filled ? "bg-brand-400" : "bg-gray-200"}`}
          />
        ))}
      </div>
      <span className="text-[9px] text-gray-400 leading-none">{label.slice(0, 5)}</span>
    </div>
  );
}

function formatCOP(amount: number) {
  return `COP $${amount.toLocaleString("es-CO")}`;
}

export function VehicleCard({ vehicle, onClick }: { vehicle: VehicleListItem; onClick?: () => void }) {
  const visiblePhotos = (vehicle.photos ?? []).filter((p) => p.is_visible);

  const whatsappMsg = encodeURIComponent(
    `Hola, estoy interesado en el ${vehicle.brand}${vehicle.model_line ? ` ${vehicle.model_line}` : ""} (${vehicle.license_plate}). ¿Está disponible?`
  );

  const scores = [
    vehicle.score_elegance ?? null,
    vehicle.score_exclusivity ?? null,
    vehicle.score_photogeny ?? null,
    vehicle.score_comfort ?? null,
    vehicle.score_romance ?? null,
  ] as (number | null)[];

  return (
    <div
      className="bg-white rounded-2xl shadow-sm border border-brand-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow duration-200 cursor-pointer"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick?.()}
      aria-label={`Ver detalle de ${vehicle.brand}${vehicle.model_line ? ` ${vehicle.model_line}` : ""}`}
    >
      {/* Photo */}
      <div className="relative aspect-[4/3] bg-gradient-to-br from-brand-50 to-brand-100 overflow-hidden">
        <PhotoSlider
          photos={visiblePhotos}
          brandInitial={vehicle.brand[0]}
          brandName={vehicle.brand}
        />

        {/* Badges over photo */}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          {vehicle.body_type && vehicle.body_type !== "NA" && (
            <span className="px-2 py-0.5 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-gray-700 shadow-sm">
              {vehicle.body_type}
            </span>
          )}
          {vehicle.pico_y_placa_day && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold shadow-sm ${DAY_COLOR[vehicle.pico_y_placa_day] ?? "bg-gray-100 text-gray-700"}`}
              title={`Pico y Placa en Medellín: ${PICO_HOURS}`}
            >
              Pico y placa {vehicle.pico_y_placa_day}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-4 gap-3">
        {/* Title */}
        <div>
          <h3 className="font-bold text-gray-900 leading-tight">
            {vehicle.brand}{vehicle.model_line ? ` ${vehicle.model_line}` : ""}
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {[vehicle.year, vehicle.color].filter(Boolean).join(" · ")}
          </p>
        </div>

        {/* Score */}
        {vehicle.score_total !== null && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Puntuación</span>
              <span className="text-xs font-bold text-brand-700">{vehicle.score_total}/25</span>
            </div>
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-brand-400 to-brand-500 rounded-full"
                style={{ width: `${(vehicle.score_total / 25) * 100}%` }}
              />
            </div>
            <div className="flex justify-between pt-1">
              {scores.map((s, i) => (
                <ScoreDot key={i} value={s} label={SCORE_LABELS[i]} />
              ))}
            </div>
          </div>
        )}

        {/* Price */}
        {vehicle.price_medellin == null && vehicle.price_rionegro == null ? (
          <p className="text-sm text-gray-400">Precio a consultar</p>
        ) : (
          <div className="space-y-0.5">
            {vehicle.price_medellin != null && (
              <p className="text-sm text-gray-700">
                <span className="font-medium">Medellín</span>
                <span className="ml-2 font-semibold text-gray-900">{formatCOP(vehicle.price_medellin)}</span>
              </p>
            )}
            {vehicle.price_rionegro != null && (
              <p className="text-sm text-gray-700">
                <span className="font-medium">Llanogrande</span>
                <span className="ml-2 font-semibold text-gray-900">{formatCOP(vehicle.price_rionegro)}</span>
              </p>
            )}
            <p className="text-[11px] text-gray-400">Para otras zonas, consultar precio</p>
          </div>
        )}

        {/* CTA */}
        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMsg}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="mt-auto w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Consultar disponibilidad
        </a>
      </div>
    </div>
  );
}
