import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, X, MapPin, Lock, PhoneCall } from "lucide-react";
import type { PublicVehicleListItem } from "../../types/vehicle";
import { priceForYear, type PriceUnlock } from "../../utils/priceUnlock";
import { buildAvailabilityMessage } from "../../utils/vehicleWhatsappMessage";
import { AdminEditLink } from "../../components/AdminEditLink";
import { ShareVehicleButton } from "../../components/ShareVehicleButton";
import { SCORE_CATEGORIES, ScoreDotsRow, ScoreTotalBar } from "../../components/ui/ScoreRating";
import { useLang } from "../../i18n/LanguageContext";
import { CATEGORY_LABEL_KEY, BODY_TYPE_LABEL_KEY, LOCATION_LABEL_KEY, PICO_DAY_LABEL_KEY } from "../../i18n/catalogLabels";
import { whatsAppLinkProps } from "../../utils/whatsapp";
import { useSwipeNavigation } from "../../hooks/useSwipeNavigation";
import { isTouchPrimaryDevice } from "../../utils/device";
import { WhatsAppIcon } from "../../components/WhatsAppIcon";

const WHATSAPP_NUMBER = "573147372030";
const PICO_HOURS = "5:00 AM – 8:00 PM";

const DAY_COLOR: Record<string, string> = {
  Lunes: "bg-blue-100 text-blue-700",
  Martes: "bg-purple-100 text-purple-700",
  Miércoles: "bg-yellow-100 text-yellow-700",
  Jueves: "bg-orange-100 text-orange-700",
  Viernes: "bg-green-100 text-green-700",
};

function formatCOP(amount: number) {
  return `$${amount.toLocaleString("es-CO")}`;
}

interface Props {
  vehicle: PublicVehicleListItem;
  onClose: () => void;
  unlock?: PriceUnlock | null;
  onRequestUnlock?: () => void;
  hidePricing?: boolean;
}

export function VehicleModal({ vehicle, onClose, unlock, onRequestUnlock, hidePricing }: Props) {
  const { t, lang, pickLocalized } = useLang();
  const photos = (vehicle.photos ?? []).filter((p) => p.is_visible);
  const [current, setCurrent] = useState(0);
  const [searchParams] = useSearchParams();
  const fecha = searchParams.get("fecha");

  const prev = () => setCurrent((c) => (c === 0 ? photos.length - 1 : c - 1));
  const next = () => setCurrent((c) => (c === photos.length - 1 ? 0 : c + 1));
  const { ref: photoRef, ...swipeHandlers } = useSwipeNavigation({ onNext: next, onPrev: prev });
  // Chevrons are hover-revealed on desktop (no visual clutter), but there's
  // no hover on touch — show them plainly there instead, or a mobile
  // visitor would never discover a vehicle has more than one photo.
  const controlsVisibility = isTouchPrimaryDevice() ? "opacity-100" : "opacity-0 group-hover:opacity-100";

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

  const whatsappMsg = encodeURIComponent(buildAvailabilityMessage(vehicle, unlock, t, lang));

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
          aria-label={t("vehicleModal.close")}
        >
          <X size={18} />
        </button>
        <ShareVehicleButton
          vehicleId={vehicle.id}
          vehicleName={`${vehicle.brand}${vehicle.model_line ? ` ${vehicle.model_line}` : ""}`}
          className="absolute top-3 right-14 z-20 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors cursor-pointer"
        />

        <div className="flex flex-col sm:flex-row overflow-y-auto sm:overflow-hidden">
          {/* ── Photo gallery (left / top) ─────────────────────── */}
          <div className="sm:w-[58%] sm:flex-shrink-0 flex flex-col bg-black">
            {/* Main image */}
            <div className="relative aspect-[4/3] sm:aspect-auto sm:flex-1 overflow-hidden group touch-pan-y" {...swipeHandlers}>
              {photos.length === 0 ? (
                <div className="w-full h-full min-h-[240px] flex flex-col items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100 gap-3">
                  <div className="w-20 h-20 rounded-full bg-brand-100 flex items-center justify-center">
                    <span className="text-3xl font-brand text-brand-400">{vehicle.brand[0]}</span>
                  </div>
                  <span className="text-sm text-gray-400">{vehicle.brand}</span>
                </div>
              ) : (
                <>
                  <img
                    ref={photoRef}
                    src={photos[current].url}
                    alt={photos[current].original_name}
                    className="w-full h-full object-cover"
                  />
                  {photos.length > 1 && (
                    <>
                      <button
                        onClick={prev}
                        className={`absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-all cursor-pointer ${controlsVisibility}`}
                        aria-label={t("vehicleModal.prevPhoto")}
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <button
                        onClick={next}
                        className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-all cursor-pointer ${controlsVisibility}`}
                        aria-label={t("vehicleModal.nextPhoto")}
                      >
                        <ChevronRight size={20} />
                      </button>
                      <div className="absolute bottom-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                        {current + 1} / {photos.length}
                      </div>
                    </>
                  )}
                  {/* Optional photo credit — hidden entirely when this photo
                      has no providers attached (the common case). Bottom-left
                      so it never competes with the counter badge above.
                      Credited people are Contact rows — instagram is stored
                      as a bare handle (e.g. "@usuario"), same normalization
                      ContactList.tsx uses to build the link. */}
                  {photos[current].providers.length > 0 && (
                    <div className="absolute bottom-3 left-3 max-w-[70%] bg-black/50 text-white text-xs px-2 py-1 rounded-full truncate">
                      {t("vehicleModal.photoCredit")}:{" "}
                      {photos[current].providers.map((p, i) => (
                        <span key={p.id}>
                          {i > 0 && " · "}
                          {p.instagram ? (
                            <a href={`https://www.instagram.com/${p.instagram.replace(/^@/, '')}`} target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">
                              {p.full_name}
                            </a>
                          ) : p.full_name}
                        </span>
                      ))}
                    </div>
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
                      i === current ? "border-brand-400 opacity-100" : "border-transparent opacity-50 hover:opacity-80"
                    }`}
                    aria-label={t("vehicleModal.viewPhoto", { n: i + 1 })}
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
                {vehicle.category && (
                  <span className="px-2 py-0.5 bg-brand-50 text-brand-600 rounded-full text-xs font-medium">
                    {t(CATEGORY_LABEL_KEY[vehicle.category])}
                  </span>
                )}
                {vehicle.body_type && vehicle.body_type !== "NA" && (
                  <span className="px-2 py-0.5 bg-brand-50 text-brand-600 rounded-full text-xs font-medium">
                    {BODY_TYPE_LABEL_KEY[vehicle.body_type] ? t(BODY_TYPE_LABEL_KEY[vehicle.body_type]) : vehicle.body_type}
                  </span>
                )}
                {vehicle.pico_y_placa_day && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold ${DAY_COLOR[vehicle.pico_y_placa_day] ?? "bg-gray-100 text-gray-700"}`}
                    title={t("vehicleModal.picoYPlacaTooltip", { hours: PICO_HOURS })}
                  >
                    {t("vehicleModal.picoYPlaca", { day: PICO_DAY_LABEL_KEY[vehicle.pico_y_placa_day] ? t(PICO_DAY_LABEL_KEY[vehicle.pico_y_placa_day]) : vehicle.pico_y_placa_day })}
                  </span>
                )}
                {fecha && (
                  <AdminEditLink
                    to={`/vehiculos/${vehicle.id}?fecha=${fecha}`}
                    label={t("vehicleModal.contactOwner")}
                    icon={PhoneCall}
                  />
                )}
              </div>
              <h2 className="text-xl font-bold text-gray-900 leading-tight">
                {vehicle.brand}{vehicle.model_line ? ` ${vehicle.model_line}` : ""}
              </h2>
              <p className="text-gray-500 text-sm mt-0.5">
                {[vehicle.year, vehicle.color].filter(Boolean).join(" · ")}
              </p>
            </div>

            {vehicle.bride_description && (
              <p className="text-sm text-gray-600 leading-relaxed italic">
                {pickLocalized(vehicle.bride_description, vehicle.bride_description_en)}
              </p>
            )}

            {/* Location + Price */}
            <div className="flex flex-col gap-1.5 border border-gray-100 rounded-xl p-3 bg-gray-50">
              <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                <MapPin size={12} />
                <span>{LOCATION_LABEL_KEY[vehicle.location] ? t(LOCATION_LABEL_KEY[vehicle.location]) : vehicle.location}</span>
              </div>
              {/* Price — omitted entirely for a use-case-scoped catalog
                  (productions/activations are quoted separately, by the
                  hour); the WhatsApp CTA below already covers "contact us"
                  for that case. Location above still shows either way. */}
              {!hidePricing && (vehicle.price_medellin || vehicle.price_rionegro) && !unlock && (
                <button
                  onClick={() => onRequestUnlock?.()}
                  className="flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700 cursor-pointer"
                >
                  <Lock size={13} />
                  {t("vehicleModal.seePrice")}
                </button>
              )}
              {!hidePricing && (vehicle.price_medellin || vehicle.price_rionegro) && unlock && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t("vehicleModal.medellin")}</span>
                  <span className={`font-semibold ${vehicle.price_medellin != null ? "text-gray-900" : "text-gray-400"}`}>
                    {vehicle.price_medellin != null ? formatCOP(priceForYear(vehicle.price_medellin, unlock.weddingDate)) : t("vehicleModal.notApplicable")}
                  </span>
                </div>
              )}
              {!hidePricing && (vehicle.price_medellin || vehicle.price_rionegro) && unlock && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t("vehicleModal.llanogrande")}</span>
                  <span className={`font-semibold ${vehicle.price_rionegro != null ? "text-gray-900" : "text-gray-400"}`}>
                    {vehicle.price_rionegro != null ? formatCOP(priceForYear(vehicle.price_rionegro, unlock.weddingDate)) : t("vehicleModal.notApplicable")}
                  </span>
                </div>
              )}
              {!hidePricing && (vehicle.price_medellin || vehicle.price_rionegro) && unlock && (
                <p className="text-[11px] text-gray-400">{t("vehicleModal.priceFootnote")}</p>
              )}
              {!hidePricing && !vehicle.price_medellin && !vehicle.price_rionegro && (
                <p className="text-sm text-gray-400">{t("vehicleModal.priceOnRequest")}</p>
              )}
            </div>

            {/* Score breakdown — same idea as price above: the wedding vetting
                score doesn't apply to a use-case-scoped catalog
                (productions/activations quote separately, by the hour). */}
            {!hidePricing && vehicle.score_total !== null && (
              <div>
                <ScoreTotalBar total={vehicle.score_total} size="lg" />
                <div className="grid grid-cols-5 gap-1 mt-3">
                  {SCORE_CATEGORIES.map(({ field, label, short, icon }) => (
                    <ScoreDotsRow
                      key={field}
                      label={short}
                      tooltip={label}
                      icon={icon}
                      value={vehicle[field as keyof typeof vehicle] as number | null}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* CTA — compact on purpose (wishlist fila 63), same treatment
                as the catalog card's button: less bold/tall, same
                recognizable solid WhatsApp green. */}
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMsg}`}
              {...whatsAppLinkProps()}
              className="mt-auto w-full flex items-center justify-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium py-2 rounded-xl shadow-sm shadow-brand-500/25 hover:shadow-md hover:shadow-brand-500/30 transition-all active:scale-[0.98] cursor-pointer"
            >
              <WhatsAppIcon className="w-3.5 h-3.5" />
              {t("vehicleModal.checkAvailability")}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
