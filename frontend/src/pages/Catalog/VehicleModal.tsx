import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X, MapPin } from "lucide-react";
import type { VehicleListItem } from "../../types/vehicle";

const WHATSAPP_NUMBER = "573147372030";
const PICO_HOURS = "6:00–8:30 AM  |  5:00–7:30 PM";

const DAY_COLOR: Record<string, string> = {
  Lunes: "bg-blue-100 text-blue-700",
  Martes: "bg-purple-100 text-purple-700",
  Miércoles: "bg-yellow-100 text-yellow-700",
  Jueves: "bg-orange-100 text-orange-700",
  Viernes: "bg-green-100 text-green-700",
};

const LOCATION_LABEL: Record<string, string> = {
  medellin: "Medellín",
  rionegro: "Rionegro",
  carmen_de_viboral: "Carmen de Viboral",
};

const SCORE_LABELS = ["Elegancia", "Exclusividad", "Fotogenia", "Comodidad", "Romanticismo"];
const SCORE_ICONS = ["✨", "💎", "📸", "🛋️", "💕"];

function formatCOP(amount: number) {
  return `$${amount.toLocaleString("es-CO")}`;
}

interface Props {
  vehicle: VehicleListItem;
  onClose: () => void;
}

export function VehicleModal({ vehicle, onClose }: Props) {
  const photos = (vehicle.photos ?? []).filter((p) => p.is_visible);
  const [current, setCurrent] = useState(0);

  const prev = () => setCurrent((c) => (c === 0 ? photos.length - 1 : c - 1));
  const next = () => setCurrent((c) => (c === photos.length - 1 ? 0 : c + 1));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && photos.length > 1) prev();
      if (e.key === "ArrowRight" && photos.length > 1) next();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [photos.length]);

  const scores = [
    vehicle.score_elegance,
    vehicle.score_exclusivity,
    vehicle.score_photogeny,
    vehicle.score_comfort,
    vehicle.score_romance,
  ];

  const whatsappMsg = encodeURIComponent(
    `Hola, estoy interesado en el ${vehicle.brand}${vehicle.model_line ? ` ${vehicle.model_line}` : ""} (${vehicle.license_plate}). ¿Está disponible?`
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative z-10 bg-white w-full sm:max-w-4xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[95dvh] flex flex-col">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-20 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors cursor-pointer"
          aria-label="Cerrar"
        >
          <X size={18} />
        </button>

        <div className="flex flex-col sm:flex-row overflow-y-auto sm:overflow-hidden">
          {/* ── Photo gallery (left / top) ─────────────────────── */}
          <div className="sm:w-[58%] sm:flex-shrink-0 flex flex-col bg-black">
            {/* Main image */}
            <div className="relative aspect-[4/3] sm:aspect-auto sm:flex-1 overflow-hidden group">
              {photos.length === 0 ? (
                <div className="w-full h-full min-h-[240px] flex flex-col items-center justify-center bg-gradient-to-br from-pink-50 to-yellow-50 gap-3">
                  <div className="w-20 h-20 rounded-full bg-pink-100 flex items-center justify-center">
                    <span className="text-3xl font-brand text-pink-400">{vehicle.brand[0]}</span>
                  </div>
                  <span className="text-sm text-gray-400">{vehicle.brand}</span>
                </div>
              ) : (
                <>
                  <img
                    src={photos[current].url}
                    alt={photos[current].original_name}
                    className="w-full h-full object-cover"
                  />
                  {photos.length > 1 && (
                    <>
                      <button
                        onClick={prev}
                        className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                        aria-label="Foto anterior"
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <button
                        onClick={next}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                        aria-label="Foto siguiente"
                      >
                        <ChevronRight size={20} />
                      </button>
                      <div className="absolute bottom-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                        {current + 1} / {photos.length}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>

            {/* Thumbnails */}
            {photos.length > 1 && (
              <div className="flex gap-1.5 p-2 bg-black overflow-x-auto">
                {photos.map((p, i) => (
                  <button
                    key={p.id}
                    onClick={() => setCurrent(i)}
                    className={`flex-shrink-0 w-14 h-10 rounded overflow-hidden border-2 transition-all cursor-pointer ${
                      i === current ? "border-pink-400 opacity-100" : "border-transparent opacity-50 hover:opacity-80"
                    }`}
                    aria-label={`Ver foto ${i + 1}`}
                  >
                    <img src={p.url} alt={p.original_name} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Details (right / bottom) ──────────────────────── */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 flex flex-col gap-4 sm:max-h-[80dvh]">
            {/* Header */}
            <div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {vehicle.body_type && vehicle.body_type !== "NA" && (
                  <span className="px-2 py-0.5 bg-pink-50 text-pink-700 rounded-full text-xs font-medium">
                    {vehicle.body_type}
                  </span>
                )}
                {vehicle.pico_y_placa_day && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold ${DAY_COLOR[vehicle.pico_y_placa_day] ?? "bg-gray-100 text-gray-700"}`}
                    title={`Pico y Placa en Medellín: ${PICO_HOURS}`}
                  >
                    P&P {vehicle.pico_y_placa_day}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-gray-900 leading-tight">
                {vehicle.brand}{vehicle.model_line ? ` ${vehicle.model_line}` : ""}
              </h2>
              <p className="text-gray-500 text-sm mt-0.5">
                {[vehicle.year, vehicle.color].filter(Boolean).join(" · ")}
              </p>
            </div>

            {/* Location + Price */}
            <div className="flex flex-col gap-1.5 border border-gray-100 rounded-xl p-3 bg-gray-50">
              <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                <MapPin size={12} />
                <span>{LOCATION_LABEL[vehicle.location] ?? vehicle.location}</span>
              </div>
              {vehicle.price_medellin && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Medellín</span>
                  <span className="font-semibold text-gray-900">{formatCOP(vehicle.price_medellin)}</span>
                </div>
              )}
              {vehicle.price_rionegro && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Rionegro</span>
                  <span className="font-semibold text-gray-900">{formatCOP(vehicle.price_rionegro)}</span>
                </div>
              )}
              {!vehicle.price_medellin && !vehicle.price_rionegro && (
                <p className="text-sm text-gray-400">Precio a consultar</p>
              )}
            </div>

            {/* Score breakdown */}
            {vehicle.score_total !== null && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Puntuación</span>
                  <span className="text-sm font-bold text-pink-600">{vehicle.score_total}/25</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full bg-gradient-to-r from-pink-400 to-yellow-400 rounded-full"
                    style={{ width: `${(vehicle.score_total / 25) * 100}%` }}
                  />
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {scores.map((s, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <span className="text-base">{SCORE_ICONS[i]}</span>
                      <div className="flex flex-col gap-0.5">
                        {[1,2,3,4,5].map((dot) => (
                          <div
                            key={dot}
                            className={`w-full h-1 rounded-full ${dot <= (s ?? 0) ? "bg-pink-400" : "bg-gray-200"}`}
                            style={{ width: "20px" }}
                          />
                        ))}
                      </div>
                      <span className="text-[9px] text-gray-400 text-center leading-tight">{SCORE_LABELS[i].slice(0,6)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CTA */}
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMsg}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-auto w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold py-3 rounded-xl transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Consultar disponibilidad
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
