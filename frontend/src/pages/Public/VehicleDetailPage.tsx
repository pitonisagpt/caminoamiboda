import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ChevronLeft, Lock, MapPin, Pencil, Star } from "lucide-react";
import { vehiclesApi } from "../../api/vehicles";
import { reviewsApi, type Review } from "../../api/reviews";
import type { PublicVehicleListItem } from "../../types/vehicle";
import { PhotoSlider } from "../Catalog/PhotoSlider";
import { RevealPricesModal } from "../Catalog/RevealPricesModal";
import { ShareVehicleButton } from "../../components/ShareVehicleButton";
import { AdminEditLink } from "../../components/AdminEditLink";
import { SCORE_CATEGORY_KEYS, ScoreDotsRow, ScoreTotalBar } from "../../components/ui/ScoreRating";
import { getUnlock, priceForYear, type PriceUnlock } from "../../utils/priceUnlock";
import { vehicleFromPrice } from "../../components/vehicleFilterKit";
import { buildAvailabilityMessage } from "../../utils/vehicleWhatsappMessage";
import { vehicleSlugPath, parseVehicleIdFromSlug } from "../../utils/slug";
import { whatsAppLinkProps } from "../../utils/whatsapp";
import { formatCOP } from "../../utils/format";
import { WhatsAppIcon } from "../../components/WhatsAppIcon";
import { useLang } from "../../i18n/LanguageContext";
import { HreflangTags } from "../../i18n/HreflangTags";
import { CATEGORY_LABEL_KEY, BODY_TYPE_LABEL_KEY, LOCATION_LABEL_KEY, PICO_DAY_LABEL_KEY } from "../../i18n/catalogLabels";
import NotFoundPage from "./NotFoundPage";
import { Skeleton, SkeletonGroup } from "../../components/ui/Skeleton";

const SITE_URL = "https://caminoamiboda.com";
const WHATSAPP_NUMBER = "573147372030";
const PICO_HOURS = "5:00 AM – 8:00 PM";

// Same palette VehicleModal.tsx/VehicleCard.tsx use for this badge.
const DAY_COLOR: Record<string, string> = {
  Lunes: "bg-blue-100 text-blue-700",
  Martes: "bg-purple-100 text-purple-700",
  Miércoles: "bg-yellow-100 text-yellow-700",
  Jueves: "bg-orange-100 text-orange-700",
  Viernes: "bg-green-100 text-green-700",
};


/** Same `max-w-5xl` shell + two-column layout as the real page below, so
 * swapping in the loaded content doesn't shift anything. */
function VehicleDetailSkeleton({ label }: { label: string }) {
  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <Skeleton className="h-5 w-32 mb-4" />
      <SkeletonGroup label={label} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton className="aspect-[4/3] rounded-2xl" />
        <div className="flex flex-col gap-4">
          <div>
            <div className="flex gap-1.5 mb-2">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-7 w-2/3 mb-2" />
            <Skeleton className="h-4 w-1/3" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <div className="border border-gray-100 rounded-xl p-3 bg-gray-50 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-32" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-2 w-full rounded-full" />
            <div className="grid grid-cols-5 gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-4 rounded-full" />
              ))}
            </div>
          </div>
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      </SkeletonGroup>
    </div>
  );
}

/** Per-vehicle public landing page (wishlist SEO/GEO checklist) —
 * `/carros/<id>-<slug>` (and its /en/ twin, mirrored automatically by
 * PUBLIC_SITE_ROUTES same as blog/:slug). Deliberately a real standalone
 * page, not the VehicleModal dialog reused as-is: a fixed-overlay
 * role="dialog" component is the wrong semantics for a page landed on
 * directly from Google, and it would hide the site header/nav/footer.
 * Reuses the same building blocks VehicleModal.tsx/CatalogPage.tsx
 * already use (PhotoSlider, priceUnlock, RevealPricesModal,
 * buildAvailabilityMessage, ScoreRating) so pricing/gating behavior stays
 * identical to the catalog — this page must never leak a price to a
 * visitor who hasn't unlocked it there. */
export default function VehicleDetailPage() {
  const { idSlug } = useParams<{ idSlug: string }>();
  const { t, lang, pickLocalized } = useLang();
  const [vehicles, setVehicles] = useState<PublicVehicleListItem[] | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [unlock, setUnlockState] = useState<PriceUnlock | null>(() => getUnlock());
  const [gateOpen, setGateOpen] = useState(false);

  const vehicleId = parseVehicleIdFromSlug(idSlug);

  useEffect(() => {
    vehiclesApi.list().then((res) => setVehicles(res.data)).catch(() => setVehicles([]));
  }, []);

  useEffect(() => {
    if (!vehicleId) return;
    reviewsApi.listPublic(vehicleId).then((res) => setReviews(res.data)).catch(() => setReviews([]));
  }, [vehicleId]);

  // Still loading the shared vehicle list — same fetch every catalog page
  // already does, but a direct landing here (Google result, shared link)
  // hits this cold, so it's a real network round-trip, not just an instant.
  if (vehicles === null) return <VehicleDetailSkeleton label={t("common.loading")} />;

  const vehicle = vehicleId ? vehicles.find((v) => v.id === vehicleId) ?? null : null;
  if (!vehicle) return <NotFoundPage />;

  const photos = (vehicle.photos ?? []).filter((p) => p.is_visible);
  const vehicleName = `${vehicle.brand}${vehicle.model_line ? ` ${vehicle.model_line}` : ""}`;
  const canonicalPath = `/carros/${vehicleSlugPath(vehicle)}`;
  // Checking bare bride_description here would almost never fall back —
  // nearly every vehicle has the Spanish field filled in, so an English
  // visitor would silently get pickLocalized()'s Spanish fallback instead
  // of ever seeing this sentence. Check the field for the CURRENT lang.
  const hasOwnDescription = lang === "en" ? Boolean(vehicle.bride_description_en) : Boolean(vehicle.bride_description);
  const description = hasOwnDescription
    ? pickLocalized(vehicle.bride_description ?? "", vehicle.bride_description_en)
    : t("vehiclePage.fallbackDescription", { vehicle: vehicleName });
  const pageTitle = `${vehicleName} | Camino a mi Boda`;
  const image = photos[0]?.url ?? `${SITE_URL}/favicon.png`;
  const hasPrice = Boolean(vehicle.price_medellin || vehicle.price_rionegro);
  const basePrice = vehicleFromPrice(vehicle);
  const visibleReviews = reviews.filter((r) => r.is_visible);

  const whatsappMsg = encodeURIComponent(buildAvailabilityMessage(vehicle, unlock, t, lang));

  // JSON-LD offers: the base "Desde $X" price (same vehicleFromPrice()
  // VehicleCard.tsx already shows unconditionally, mejoras.md ítem 1) is
  // always public, so it's always safe to emit — unlike the old version
  // here, which only emitted `offers` once a visitor had unlocked pricing
  // via RevealPricesModal. Since a crawler (Googlebot included) never
  // triggers that unlock, `offers` was empty on every single crawl,
  // which is exactly why Google's Rich Results test flagged this
  // Product as invalid ("Debe especificarse offers, review o
  // aggregateRating" — confirmed live via Search Console, 2026-09-19).
  // A real visitor who *has* unlocked still gets the richer, date-escalated
  // per-location AggregateOffer, same as before.
  const unlockedOffers = unlock
    ? [vehicle.price_medellin, vehicle.price_rionegro]
        .filter((p): p is number => p != null)
        .map((p) => priceForYear(p, unlock.weddingDate))
    : [];
  const offers = unlockedOffers.length > 0
    ? { "@type": "AggregateOffer", priceCurrency: "COP", lowPrice: Math.min(...unlockedOffers), highPrice: Math.max(...unlockedOffers), availability: "https://schema.org/InStock" }
    : basePrice != null
      ? { "@type": "Offer", priceCurrency: "COP", price: basePrice, availability: "https://schema.org/InStock" }
      : null;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: vehicleName,
      description,
      image,
      brand: { "@type": "Brand", name: vehicle.brand },
      ...(offers ? { offers } : {}),
      ...(visibleReviews.length > 0
        ? {
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: (visibleReviews.reduce((sum, r) => sum + r.rating, 0) / visibleReviews.length).toFixed(1),
              reviewCount: visibleReviews.length,
            },
          }
        : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: t("nav.catalog"), item: `${SITE_URL}/catalogo` },
        { "@type": "ListItem", position: 2, name: vehicleName, item: `${SITE_URL}${canonicalPath}` },
      ],
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <HreflangTags path={canonicalPath} />
      <Helmet>
        <html lang={lang} />
        <title>{pageTitle}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={image} />
        <meta property="og:url" content={`${SITE_URL}${canonicalPath}`} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      {gateOpen && (
        <RevealPricesModal
          onClose={() => setGateOpen(false)}
          onUnlocked={(weddingDate) => {
            setUnlockState(getUnlock());
            setGateOpen(false);
            void weddingDate;
          }}
        />
      )}

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-gray-500 mb-4">
        <Link to={lang === "en" ? "/en/catalogo" : "/catalogo"} className="hover:text-brand-600 flex items-center gap-1">
          <ChevronLeft size={14} />
          {t("vehiclePage.backToCatalog")}
        </Link>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Photo gallery */}
        <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-black group">
          <PhotoSlider photos={photos} brandInitial={vehicle.brand[0]} brandName={vehicle.brand} size="full" />
          <ShareVehicleButton
            vehicleId={vehicle.id}
            vehicleName={vehicleName}
            brand={vehicle.brand}
            modelLine={vehicle.model_line}
            color={vehicle.color}
            className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors cursor-pointer"
          />
        </div>

        {/* Details */}
        <div className="flex flex-col gap-4">
          <div>
            <div className="flex flex-wrap gap-1.5 mb-2 items-center">
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
              <AdminEditLink to={`/vehiculos/${vehicle.id}`} icon={Pencil} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 leading-tight">{vehicleName}</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {[vehicle.year, vehicle.color].filter(Boolean).join(" · ")}
            </p>
          </div>

          {description && <p className="text-sm text-gray-600 leading-relaxed italic">{description}</p>}

          {/* Location + Price — base "Desde $X" always visible (mejoras.md
              ítem 1, same vehicleFromPrice() VehicleCard.tsx already uses
              unconditionally); unlocking via RevealPricesModal still adds
              the detailed per-location, date-escalated breakdown below. */}
          <div className="flex flex-col gap-1.5 border border-gray-100 rounded-xl p-3 bg-gray-50">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
              <MapPin size={12} />
              <span>{LOCATION_LABEL_KEY[vehicle.location] ? t(LOCATION_LABEL_KEY[vehicle.location]) : vehicle.location}</span>
            </div>
            {basePrice != null && (
              <p className="text-sm text-gray-700">
                <span className="text-gray-500">{t("catalog.priceFromLabel")}</span>{" "}
                <span className="font-bold text-gray-900">
                  {formatCOP(unlock ? priceForYear(basePrice, unlock.weddingDate) : basePrice)}
                </span>
              </p>
            )}
            {hasPrice && !unlock && (
              <button
                onClick={() => setGateOpen(true)}
                className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 cursor-pointer"
              >
                <Lock size={11} />
                {t("catalog.exactQuoteLink")}
              </button>
            )}
            {hasPrice && unlock && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t("vehicleModal.medellin")}</span>
                  <span className={`font-semibold ${vehicle.price_medellin != null ? "text-gray-900" : "text-gray-400"}`}>
                    {vehicle.price_medellin != null ? formatCOP(priceForYear(vehicle.price_medellin, unlock.weddingDate)) : t("vehicleModal.notApplicable")}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t("vehicleModal.llanogrande")}</span>
                  <span className={`font-semibold ${vehicle.price_rionegro != null ? "text-gray-900" : "text-gray-400"}`}>
                    {vehicle.price_rionegro != null ? formatCOP(priceForYear(vehicle.price_rionegro, unlock.weddingDate)) : t("vehicleModal.notApplicable")}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400">{t("vehicleModal.priceFootnote")}</p>
              </>
            )}
            {!hasPrice && <p className="text-sm text-gray-400">{t("vehicleModal.priceOnRequest")}</p>}
          </div>

          {vehicle.score_total !== null && (
            <div>
              <ScoreTotalBar total={vehicle.score_total} size="lg" label={t("vehicleModal.scoreLabel")} />
              <div className="grid grid-cols-5 gap-1 mt-3">
                {SCORE_CATEGORY_KEYS.map(({ field, labelKey, shortKey, icon }) => (
                  <ScoreDotsRow
                    key={field}
                    label={t(shortKey)}
                    tooltip={t(labelKey)}
                    icon={icon}
                    value={vehicle[field as keyof typeof vehicle] as number | null}
                  />
                ))}
              </div>
            </div>
          )}

          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMsg}`}
            {...whatsAppLinkProps()}
            className="w-full flex items-center justify-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium py-2.5 rounded-xl shadow-sm shadow-brand-500/25 hover:shadow-md hover:shadow-brand-500/30 transition-all active:scale-[0.98] cursor-pointer"
          >
            <WhatsAppIcon className="w-4 h-4" />
            {t("vehicleModal.checkAvailability")}
          </a>
        </div>
      </div>

      {/* Reviews — real content for this vehicle, feeds both the reader
          and the aggregateRating in the JSON-LD above. */}
      {visibleReviews.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-bold text-gray-900 mb-3">{t("vehiclePage.reviews")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {visibleReviews.map((r) => (
              <div key={r.id} className="border border-gray-100 rounded-xl p-4 bg-white">
                <div className="flex items-center gap-1 mb-1.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={13} className={i < r.rating ? "fill-amber-400 text-amber-400" : "text-gray-200"} />
                  ))}
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{pickLocalized(r.body, r.body_en)}</p>
                <div className="flex items-center justify-between gap-2 mt-2">
                  <p className="text-xs text-gray-400 font-medium">{r.author_name}</p>
                  {lang === "en" && !r.body_en && (
                    <span className="text-[10px] text-gray-400 italic shrink-0">{t("vehiclePage.shownInSpanish")}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
