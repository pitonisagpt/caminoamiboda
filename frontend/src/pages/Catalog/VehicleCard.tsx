import { Star, Lock, Heart } from "lucide-react";
import type { PublicVehicleListItem } from "../../types/vehicle";
import { PhotoSlider } from "./PhotoSlider";
import { priceForYear, type PriceUnlock } from "../../utils/priceUnlock";
import { vehicleFromPrice } from "../../components/vehicleFilterKit";
import { buildAvailabilityMessage } from "../../utils/vehicleWhatsappMessage";
import { AdminEditLink } from "../../components/AdminEditLink";
import { ShareVehicleButton } from "../../components/ShareVehicleButton";
import { SCORE_CATEGORIES, ScoreDotsRow, ScoreTotalBar } from "../../components/ui/ScoreRating";
import { useLang } from "../../i18n/LanguageContext";
import { CATEGORY_LABEL_KEY, BODY_TYPE_LABEL_KEY, PICO_DAY_LABEL_KEY } from "../../i18n/catalogLabels";
import { whatsAppLinkProps } from "../../utils/whatsapp";
import { WhatsAppIcon } from "../../components/WhatsAppIcon";
import { formatCOPFull as formatCOP } from "../../utils/format";

const WHATSAPP_NUMBER = "573147372030";

export function VehicleCard({
  vehicle,
  onClick,
  unlock,
  onRequestUnlock,
  hidePricing,
  availability,
  previewDate,
  isFavorite,
  onToggleFavorite,
}: {
  vehicle: PublicVehicleListItem;
  onClick?: () => void;
  unlock?: PriceUnlock | null;
  onRequestUnlock?: () => void;
  hidePricing?: boolean;
  /** undefined = no date picked yet (badge hidden). Set once the visitor
   * picks a date in the catalog's availability picker — "pico_y_placa" is
   * distinct from "unavailable" (mejoras.md ítem 9): the car isn't booked,
   * it just can't legally be driven that specific weekday. Conflating the
   * two into one red badge would hide the real reason and read as "we
   * don't actually know", which is worse than being specific. */
  availability?: "available" | "unavailable" | "pico_y_placa";
  /** The free availability-picker's date (not `unlock`'s — that one still
   * requires the lead-capture modal). When set, the "Desde $X" base price
   * escalates via priceForYear() same as the unlocked breakdown does. */
  previewDate?: string;
  /** "Favoritos" (mejoras.md ítem 9) — client-side only, see useFavorites.
   * Both optional so the heart toggle just doesn't render for a caller
   * that hasn't wired favorites support (the icon needs somewhere to
   * write the toggle to). */
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}) {
  const { t, lang } = useLang();
  const visiblePhotos = (vehicle.photos ?? []).filter((p) => p.is_visible);

  const whatsappMsg = encodeURIComponent(buildAvailabilityMessage(vehicle, unlock, t, lang));

  return (
    <div
      className="bg-white rounded-2xl shadow-sm border border-brand-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow duration-200 cursor-pointer"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick?.()}
      aria-label={t("catalog.viewDetailAria", { vehicle: `${vehicle.brand}${vehicle.model_line ? ` ${vehicle.model_line}` : ""}` })}
    >
      {/* Photo */}
      <div className="relative aspect-[4/3] bg-gradient-to-br from-brand-50 to-brand-100 overflow-hidden">
        <PhotoSlider
          photos={visiblePhotos}
          brandInitial={vehicle.brand[0]}
          brandName={vehicle.brand}
        />

        {onToggleFavorite && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
            aria-label={isFavorite ? t("catalog.unfavoriteAria") : t("catalog.favoriteAria")}
            aria-pressed={isFavorite}
            className="absolute top-2 left-2 z-10 p-2 rounded-full bg-white/90 hover:bg-white text-gray-500 shadow-sm backdrop-blur-sm transition-colors cursor-pointer"
          >
            <Heart size={16} className={isFavorite ? "fill-red-500 text-red-500" : ""} />
          </button>
        )}
        <AdminEditLink to={`/vehiculos/editar/${vehicle.id}`} className="absolute bottom-2 right-2" />
        <ShareVehicleButton
          vehicleId={vehicle.id}
          vehicleName={`${vehicle.brand}${vehicle.model_line ? ` ${vehicle.model_line}` : ""}`}
          brand={vehicle.brand}
          modelLine={vehicle.model_line}
          color={vehicle.color}
          className="absolute top-2 right-2 z-10 p-2 rounded-full bg-white/90 hover:bg-white text-gray-700 hover:text-brand-600 shadow-sm backdrop-blur-sm transition-colors cursor-pointer"
        />
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-4 gap-3">
        {/* Tags — live in the card body, not over the photo. Overlaid on
            variable photo backgrounds they crowded the image and fought
            contrast; on the white card they read as plain, legible chips. */}
        {/* Pico y placa deliberately left off this first-level tags row
            (mejoras.md ítem 9) — it's operational data (a driving
            restriction), not something a visitor is choosing between cars
            on, and it crowded the same row where a wedding really wants to
            see "featured/category/body type". It's still shown once
            someone is actually interested — VehicleModal.tsx (quick view)
            and VehicleDetailPage.tsx (the real per-vehicle page) both keep
            it in their header tags. The real "does this work for my day"
            question is already answered by the availability badge below,
            once a date is picked. */}
        {(vehicle.is_featured || vehicle.category || (vehicle.body_type && vehicle.body_type !== "NA")) && (
          <div className="flex flex-wrap gap-1.5">
            {vehicle.is_featured && (
              <span className="flex items-center gap-1 bg-brand-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                <Star size={11} className="fill-white" />
                {t("catalog.featured")}
              </span>
            )}
            {vehicle.category && (
              <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs font-medium text-gray-600">
                {t(CATEGORY_LABEL_KEY[vehicle.category])}
              </span>
            )}
            {vehicle.body_type && vehicle.body_type !== "NA" && (
              <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs font-medium text-gray-600">
                {BODY_TYPE_LABEL_KEY[vehicle.body_type] ? t(BODY_TYPE_LABEL_KEY[vehicle.body_type]) : vehicle.body_type}
              </span>
            )}
          </div>
        )}

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
            right below already covers "contact us" for that case.

            Base "Desde $X" is always visible now (mejoras.md ítem 1 — no
            card should show only a "Ver precio" lock with nothing else).
            `unlock` (RevealPricesModal's lead-capture flow) still adds the
            detailed per-location, date-escalated breakdown below, but it's
            no longer required to see a real number at all. */}
        {hidePricing ? null : (
          <div className="space-y-1">
            {(() => {
              const basePrice = vehicleFromPrice(vehicle);
              if (basePrice == null) {
                return <p className="text-sm text-gray-400">{t("vehicleModal.priceOnRequest")}</p>;
              }
              const fromPrice = previewDate ? priceForYear(basePrice, previewDate) : basePrice;
              return (
                <p className="text-sm text-gray-700">
                  <span className="text-gray-500">{t(previewDate ? "catalog.priceForDateLabel" : "catalog.priceFromLabel")}</span>{" "}
                  <span className="font-bold text-gray-900">{formatCOP(fromPrice)}</span>
                </p>
              );
            })()}

            {availability !== undefined && (
              <span
                className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                  availability === "available"
                    ? "bg-green-100 text-green-700"
                    : availability === "pico_y_placa"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-gray-200 text-gray-600"
                }`}
              >
                {availability === "available"
                  ? t("catalog.availableBadge")
                  : availability === "pico_y_placa"
                    ? t("catalog.picoYPlacaBadge", {
                        day: vehicle.pico_y_placa_day && PICO_DAY_LABEL_KEY[vehicle.pico_y_placa_day]
                          ? t(PICO_DAY_LABEL_KEY[vehicle.pico_y_placa_day])
                          : vehicle.pico_y_placa_day ?? "",
                      })
                    : t("catalog.unavailableBadge")}
              </span>
            )}

            {unlock ? (
              <div className="space-y-0.5 pt-0.5">
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
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); onRequestUnlock?.(); }}
                className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 cursor-pointer"
              >
                <Lock size={11} />
                {t("catalog.exactQuoteLink")}
              </button>
            )}
          </div>
        )}

        {/* CTA — compact on purpose (wishlist fila 63): the previous version
            was full bold-weight text at py-2.5/3, which read as a heavy,
            oversized block of saturated WhatsApp green repeated down the
            whole grid. Kept the recognizable solid green fill, just lighter
            and less tall. */}
        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMsg}`}
          {...whatsAppLinkProps()}
          onClick={(e) => e.stopPropagation()}
          className="mt-auto w-full flex items-center justify-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium py-2 rounded-xl shadow-sm shadow-brand-500/25 hover:shadow-md hover:shadow-brand-500/30 transition-all active:scale-[0.98] cursor-pointer"
        >
          <WhatsAppIcon className="w-3.5 h-3.5" />
          {t("vehicleModal.checkAvailability")}
        </a>
      </div>
    </div>
  );
}
