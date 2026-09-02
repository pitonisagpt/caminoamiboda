import { Star, Lock } from "lucide-react";
import type { PublicVehicleListItem } from "../../types/vehicle";
import { PhotoSlider } from "./PhotoSlider";
import { priceForYear, type PriceUnlock } from "../../utils/priceUnlock";
import { buildAvailabilityMessage } from "../../utils/vehicleWhatsappMessage";
import { AdminEditLink } from "../../components/AdminEditLink";
import { SCORE_CATEGORIES, ScoreDotsRow, ScoreTotalBar } from "../../components/ui/ScoreRating";
import { useLang } from "../../i18n/LanguageContext";
import { CATEGORY_LABEL_KEY, BODY_TYPE_LABEL_KEY, PICO_DAY_LABEL_KEY } from "../../i18n/catalogLabels";
import { whatsAppLinkProps } from "../../utils/whatsapp";

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
  return `COP $${amount.toLocaleString("es-CO")}`;
}

export function VehicleCard({
  vehicle,
  onClick,
  unlock,
  onRequestUnlock,
  hidePricing,
}: {
  vehicle: PublicVehicleListItem;
  onClick?: () => void;
  unlock?: PriceUnlock | null;
  onRequestUnlock?: () => void;
  hidePricing?: boolean;
}) {
  const { t } = useLang();
  const visiblePhotos = (vehicle.photos ?? []).filter((p) => p.is_visible);

  const whatsappMsg = encodeURIComponent(buildAvailabilityMessage(vehicle, unlock));

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
        <div className="absolute top-2 left-2 right-2 flex flex-wrap gap-1">
          {vehicle.is_featured && (
            <span className="flex items-center gap-1 bg-brand-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full shadow-sm">
              <Star size={11} className="fill-white" />
              {t("catalog.featured")}
            </span>
          )}
          {vehicle.category && (
            <span className="px-2 py-0.5 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-gray-700 shadow-sm">
              {t(CATEGORY_LABEL_KEY[vehicle.category])}
            </span>
          )}
          {vehicle.body_type && vehicle.body_type !== "NA" && (
            <span className="px-2 py-0.5 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-gray-700 shadow-sm">
              {BODY_TYPE_LABEL_KEY[vehicle.body_type] ? t(BODY_TYPE_LABEL_KEY[vehicle.body_type]) : vehicle.body_type}
            </span>
          )}
          {vehicle.pico_y_placa_day && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold shadow-sm ${DAY_COLOR[vehicle.pico_y_placa_day] ?? "bg-gray-100 text-gray-700"}`}
              title={t("vehicleModal.picoYPlacaTooltip", { hours: PICO_HOURS })}
            >
              {t("vehicleModal.picoYPlaca", { day: PICO_DAY_LABEL_KEY[vehicle.pico_y_placa_day] ? t(PICO_DAY_LABEL_KEY[vehicle.pico_y_placa_day]) : vehicle.pico_y_placa_day })}
            </span>
          )}
        </div>

        <AdminEditLink to={`/vehiculos/editar/${vehicle.id}`} className="absolute bottom-2 right-2" />
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

        {/* Score — same idea as price below: the wedding vetting score
            doesn't apply to a use-case-scoped catalog (productions/
            activations quote separately, by the hour). */}
        {!hidePricing && vehicle.score_total !== null && (
          <div className="space-y-1.5">
            <ScoreTotalBar total={vehicle.score_total} size="lg" />
            <div className="flex justify-between pt-1">
              {SCORE_CATEGORIES.map(({ field, label, short }) => (
                <ScoreDotsRow
                  key={field}
                  label={short}
                  tooltip={label}
                  value={vehicle[field as keyof typeof vehicle] as number | null}
                />
              ))}
            </div>
          </div>
        )}

        {/* Price — omitted entirely for a use-case-scoped catalog (productions/
            activations are quoted separately, by the hour); the WhatsApp CTA
            right below already covers "contact us" for that case. */}
        {hidePricing ? null : vehicle.price_medellin == null && vehicle.price_rionegro == null ? (
          <p className="text-sm text-gray-400">{t("vehicleModal.priceOnRequest")}</p>
        ) : !unlock ? (
          <button
            onClick={(e) => { e.stopPropagation(); onRequestUnlock?.(); }}
            className="flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700 cursor-pointer"
          >
            <Lock size={13} />
            {t("vehicleModal.seePrice")}
          </button>
        ) : (
          <div className="space-y-0.5">
            <p className="text-sm text-gray-700">
              <span className="font-medium">{t("vehicleModal.medellin")}</span>
              <span className={`ml-2 font-semibold ${vehicle.price_medellin != null ? "text-gray-900" : "text-gray-400"}`}>
                {vehicle.price_medellin != null ? formatCOP(priceForYear(vehicle.price_medellin, unlock.weddingDate)) : t("vehicleModal.notApplicable")}
              </span>
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-medium">{t("vehicleModal.llanogrande")}</span>
              <span className={`ml-2 font-semibold ${vehicle.price_rionegro != null ? "text-gray-900" : "text-gray-400"}`}>
                {vehicle.price_rionegro != null ? formatCOP(priceForYear(vehicle.price_rionegro, unlock.weddingDate)) : t("vehicleModal.notApplicable")}
              </span>
            </p>
            <p className="text-[11px] text-gray-400">{t("vehicleModal.priceFootnote")}</p>
          </div>
        )}

        {/* CTA */}
        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMsg}`}
          {...whatsAppLinkProps()}
          onClick={(e) => e.stopPropagation()}
          className="mt-auto w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          {t("vehicleModal.checkAvailability")}
        </a>
      </div>
    </div>
  );
}
