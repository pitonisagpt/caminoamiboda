import { Search, SlidersHorizontal, Star, X } from "lucide-react";
import { useMemo, useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { vehiclesApi } from "../../api/vehicles";
import { availabilityApi } from "../../api/availability";
import { VehicleCard, VehicleCardSkeleton } from "./VehicleCard";
import { SkeletonGroup } from "../../components/ui/Skeleton";
import { VehicleModal } from "./VehicleModal";
import { RevealPricesModal } from "./RevealPricesModal";
import { Modal } from "../../components/ui/Modal";
import { AvailabilityWidget } from "./AvailabilityWidget";
import { InstagramGrid } from "./InstagramGrid";
import { ParallaxHero } from "../../components/ParallaxHero";
import { FloristAllySection } from "./FloristAllySection";
import { reviewsApi, type Review } from "../../api/reviews";
import { AdminEditLink } from "../../components/AdminEditLink";
import type { VehicleCategory, PublicVehicleListItem } from "../../types/vehicle";
import { getUnlock, setUnlock, clearUnlock, priceForYear, type PriceUnlock } from "../../utils/priceUnlock";
import { vehicleSlugPath } from "../../utils/slug";
import {
  decadeOptionsFromVehicles,
  canonicalColor,
  vehiclePrice,
} from "../../components/vehicleFilterKit";
import { useLang } from "../../i18n/LanguageContext";
import { HreflangTags } from "../../i18n/HreflangTags";
import FilterPanel from "./FilterPanel";
import FavoritesBar from "./FavoritesBar";
import { useFavorites } from "../../hooks/useFavorites";

// ─── Types ─────────────────────────────────────────────────────────────────
type SortKey = "default" | "year" | "price_asc" | "price_desc";

export interface Filters {
  type: "all" | "car" | "motorcycle";
  brands: string[];
  colors: string[];
  decades: number[];
  bodyTypes: string[];
  categories: VehicleCategory[];
  capacities: number[];
  locations: string[];
  priceMin: string;
  priceMax: string;
  search: string;
}

const EMPTY_FILTERS: Filters = {
  type: "all",
  brands: [],
  colors: [],
  decades: [],
  bodyTypes: [],
  categories: [],
  capacities: [],
  locations: [],
  priceMin: "",
  priceMax: "",
  search: "",
};

// ─── URL helpers for arrays ────────────────────────────────────────────────
const toParam = (arr: (string | number)[]): string | null =>
  arr.length ? arr.map(String).join(",") : null;
const fromParam = (s: string | null): string[] =>
  s ? s.split(",").filter(Boolean) : [];

// ─── Main page ─────────────────────────────────────────────────────────────
export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [vehicles, setVehicles] = useState<PublicVehicleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<PublicVehicleListItem | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [unlock, setUnlockState] = useState<PriceUnlock | null>(() => getUnlock());
  const [gateOpen, setGateOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { t, lang, pickLocalized } = useLang();

  // Free availability check (mejoras.md ítem 1) — deliberately separate
  // from `unlock` above: that one requires RevealPricesModal's lead-capture
  // form, this one doesn't. Uses its own query param ("disponibilidad",
  // not "fecha") because "?fecha=" is already a one-shot personalized-link
  // param that gets consumed into `unlock` and stripped from the URL on
  // mount (see the effect above `filters`) — reusing it here would make
  // every date pick silently (mis)trigger that consumption path.
  const CHECK_DATE_STORAGE_KEY = "camino_availability_check_date";
  const [checkDate, setCheckDateState] = useState<string>(
    () => searchParams.get("disponibilidad") ?? localStorage.getItem(CHECK_DATE_STORAGE_KEY) ?? ""
  );
  const [unavailableIds, setUnavailableIds] = useState<Set<number>>(new Set());
  const [picoYPlacaIds, setPicoYPlacaIds] = useState<Set<number>>(new Set());
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const { favorites, toggleFavorite } = useFavorites();

  function setCheckDate(next: string) {
    setCheckDateState(next);
    setSearchParams(prev => {
      const next2 = new URLSearchParams(prev);
      if (next) next2.set("disponibilidad", next); else next2.delete("disponibilidad");
      return next2;
    }, { replace: true });
  }

  // Keyed on `checkDate` itself (not folded into setCheckDate above) so a
  // date that arrives via ?disponibilidad= URL param on first load — which
  // only sets React state through the lazy useState initializer above,
  // never calls setCheckDate() — still gets persisted. Otherwise following
  // a shared link and then later opening a plain /catalogo tab "forgets"
  // the date, even though it should still be remembered like any date
  // picked by hand.
  useEffect(() => {
    try {
      if (checkDate) localStorage.setItem(CHECK_DATE_STORAGE_KEY, checkDate);
      else localStorage.removeItem(CHECK_DATE_STORAGE_KEY);
    } catch {
      // localStorage can throw in a private-browsing edge case — the date
      // still works for this page load via state, just doesn't persist.
    }
  }, [checkDate]);

  useEffect(() => {
    if (!checkDate) {
      setUnavailableIds(new Set());
      setPicoYPlacaIds(new Set());
      return;
    }
    let cancelled = false;
    setAvailabilityLoading(true);
    availabilityApi.forDate(checkDate)
      .then(res => {
        if (cancelled) return;
        setUnavailableIds(new Set(res.data.unavailable_vehicle_ids));
        setPicoYPlacaIds(new Set(res.data.pico_y_placa_vehicle_ids));
      })
      .catch(() => { if (!cancelled) { setUnavailableIds(new Set()); setPicoYPlacaIds(new Set()); } })
      .finally(() => { if (!cancelled) setAvailabilityLoading(false); });
    return () => { cancelled = true; };
  }, [checkDate]);

  const effectivePrice = (v: PublicVehicleListItem, locations: string[]): number | null => {
    const base = vehiclePrice(v, locations);
    if (base === null) return null;
    return unlock ? priceForYear(base, unlock.weddingDate) : base;
  };

  // Personalized link (?fecha=YYYY-MM-DD&para=Nombre) — generated from a
  // reservation's Info tab so ops can send a couple a portfolio link
  // already unlocked for their date, no form to fill on their end. Applies
  // it exactly like RevealPricesModal's manual flow would (same
  // localStorage-backed setUnlock), then strips the params so the couple's
  // name/date doesn't linger in the address bar. Runs once on mount, same
  // idiom as the ?vehiculo= deep link below. A link always overwrites any
  // prior unlock in this browser — it's the most recent, most authoritative
  // signal of what date to price for.
  //
  // Also seeds `checkDate` with the same date — without this, `unlock`
  // only affects the per-vehicle modal (opened by clicking a card), so a
  // couple opening this link would see plain, unpersonalized "Desde $X"
  // cards and no availability badges until they picked the same date by
  // hand in the widget. Sets the state directly (setCheckDateState, not
  // setCheckDate) and folds it into the single setSearchParams call below
  // instead of letting setCheckDate fire its own — two separate
  // setSearchParams calls in the same tick race on a stale `prev` and
  // silently drop one of the two changes (confirmed live: the fecha/para
  // strip below would win and disponibilidad= would never make it into
  // the URL, even though the state update itself is unaffected either way).
  useEffect(() => {
    const fechaParam = searchParams.get("fecha");
    if (!fechaParam || !/^\d{4}-\d{2}-\d{2}$/.test(fechaParam)) return;
    const paraParam = searchParams.get("para") ?? "";
    setUnlock(fechaParam, paraParam, "");
    setUnlockState(getUnlock());
    setCheckDateState(fechaParam);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete("fecha");
      next.delete("para");
      next.set("disponibilidad", fechaParam);
      return next;
    }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Derive filters from URL — no useState, client-side filtering only
  const filters: Filters = {
    type: (searchParams.get("type") ?? "all") as Filters["type"],
    brands: fromParam(searchParams.get("brands")),
    colors: fromParam(searchParams.get("colors")),
    decades: fromParam(searchParams.get("decades")).map(Number),
    bodyTypes: fromParam(searchParams.get("bodyTypes")),
    categories: fromParam(searchParams.get("categories")) as VehicleCategory[],
    capacities: fromParam(searchParams.get("capacities")).map(Number),
    locations: fromParam(searchParams.get("locations")),
    priceMin: searchParams.get("priceMin") ?? "",
    priceMax: searchParams.get("priceMax") ?? "",
    search: searchParams.get("q") ?? "",
  };
  const sort = (searchParams.get("sort") ?? "default") as SortKey;

  // Presence of this param switches the whole page into a use-case-scoped
  // mode (e.g. producciones audiovisuales / activaciones de marca) that
  // filters vehicles server-side and never shows pricing — that's quoted
  // separately by the hour for those use cases, not per-vehicle like weddings.
  const useCaseParam = searchParams.get("use_case");
  const noPricing = Boolean(useCaseParam);

  function setFilters(f: Filters) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      // type
      if (f.type && f.type !== "all") next.set("type", f.type); else next.delete("type");
      // arrays
      const arrKeys: Array<[keyof Filters, string]> = [
        ["brands", "brands"], ["colors", "colors"], ["decades", "decades"],
        ["bodyTypes", "bodyTypes"], ["categories", "categories"], ["capacities", "capacities"], ["locations", "locations"],
      ];
      for (const [fk, pk] of arrKeys) {
        const arr = f[fk] as (string | number)[];
        const v = toParam(arr);
        if (v) next.set(pk, v); else next.delete(pk);
      }
      // price
      if (f.priceMin) next.set("priceMin", f.priceMin); else next.delete("priceMin");
      if (f.priceMax) next.set("priceMax", f.priceMax); else next.delete("priceMax");
      // search
      if (f.search) next.set("q", f.search); else next.delete("q");
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

  // Real, indexable per-vehicle page (mejoras.md ítem 4 / wishlist fila 66)
  // — a card click used to only set ?vehiculo=<id> and open the modal, so a
  // real visitor never landed on /carros/<slug> (no pageview, no shareable
  // URL in the address bar/history) even though that page already exists
  // and is built for exactly this. `noPricing` (productions/activaciones
  // catalog) still opens the modal below — that view deliberately hides
  // price/score, and VehicleDetailPage.tsx has no equivalent mode for it.
  function goToVehicle(v: PublicVehicleListItem) {
    navigate(`${lang === "en" ? "/en" : ""}/carros/${vehicleSlugPath(v)}`);
  }

  // Keeps ?vehiculo=<id> in sync with the open/closed modal, so the address
  // bar is always a valid, shareable link to whatever's currently open.
  function openVehicle(v: PublicVehicleListItem) {
    setSelected(v);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set("vehiculo", String(v.id));
      return next;
    }, { replace: true });
  }

  function closeVehicle() {
    setSelected(null);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete("vehiculo");
      return next;
    }, { replace: true });
  }

  useEffect(() => {
    setLoading(true);
    vehiclesApi
      .list(useCaseParam ? { use_case: useCaseParam } : undefined)
      .then(res => setVehicles(res.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [useCaseParam]);

  useEffect(() => {
    reviewsApi.listPublic().then((r: { data: Review[] }) => setReviews(r.data)).catch(() => {});
  }, []);

  // Jump to the reviews section when arriving via the "Opiniones" nav link
  // (#opiniones) — the section only exists once reviews have loaded.
  useEffect(() => {
    if (location.hash !== "#opiniones" || reviews.length === 0) return;
    // Vehicle card images below load progressively and keep growing the
    // page height, so the target position shifts after the first scroll —
    // re-scroll a couple more times to catch up once layout settles.
    const attempts = [0, 400, 1000];
    const timers = attempts.map(delay =>
      setTimeout(() => {
        document.getElementById("opiniones")?.scrollIntoView({ behavior: "smooth" });
      }, delay)
    );
    return () => timers.forEach(clearTimeout);
  }, [location.hash, reviews]);

  // Deep link (?vehiculo=<id>) — auto-opens that vehicle's modal once the
  // list has loaded. Originally built for the AI chat assistant, now also
  // the mechanism behind sharing a vehicle: opening/closing the modal keeps
  // this param in sync (see setSelected/onClose below), so the address bar
  // always reflects whichever vehicle is open and can be copied/shared
  // as-is. Only stripped here if it doesn't match a real vehicle — a stale or
  // bad id shouldn't linger in the URL.
  useEffect(() => {
    if (vehicles.length === 0) return;
    const vehiculoParam = searchParams.get("vehiculo");
    if (!vehiculoParam) return;
    const match = vehicles.find(v => v.id === Number(vehiculoParam));
    if (match) {
      setSelected(match);
    } else {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.delete("vehiculo");
        return next;
      }, { replace: true });
    }
  }, [vehicles]);

  const availableBrands = useMemo(
    () => [...new Set(vehicles.map(v => v.brand).filter(b => b && b !== "Test"))].sort(),
    [vehicles]
  );

  const availableDecades = useMemo(() => decadeOptionsFromVehicles(vehicles), [vehicles]);

  // Search suggestions (mejoras.md ítem 9: "agregar sugerencias — Combi,
  // Bel Air, convertible") — derived from the real, currently-active
  // fleet rather than hardcoded example names, so this can't drift stale
  // the way DECADE_OPTIONS did (a model that's sold/retired would keep
  // showing as a "suggestion" that returns zero results). Up to 4 distinct
  // model lines (in display_order, the business's own curated order) plus
  // one body type, so a visitor sees both "a specific car" and "a style"
  // as example searches.
  const searchSuggestions = useMemo(() => {
    const modelLines = [...new Set(vehicles.map(v => v.model_line).filter((m): m is string => !!m))].slice(0, 4);
    const bodyType = vehicles.map(v => v.body_type).find(bt => bt && bt !== "NA");
    return bodyType ? [...modelLines, bodyType] : modelLines;
  }, [vehicles]);

  const favoriteVehicles = useMemo(
    () => vehicles.filter(v => favorites.has(v.id)),
    [vehicles, favorites]
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
        if (filters.categories.length === 0) return true;
        return v.category !== null && filters.categories.includes(v.category);
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
        // No pricing at all in this mode (server already nulled it out) — a
        // stale priceMin/priceMax left over in the URL from a previous
        // wedding-catalog visit must never zero out the whole grid here.
        if (noPricing) return true;
        if (priceMin === null && priceMax === null) return true;
        const p = effectivePrice(v, filters.locations);
        if (p === null) return false;
        if (priceMin !== null && p < priceMin) return false;
        if (priceMax !== null && p > priceMax) return false;
        return true;
      })
      .filter(v => {
        if (!filters.search.trim()) return true;
        const q = filters.search.trim().toLowerCase();
        return [v.brand, v.model_line, v.color, v.body_type, v.year?.toString()]
          .some(f => f?.toLowerCase().includes(q));
      })
      .sort((a, b) => {
        if (sort === "default") return (a.display_order ?? 0) - (b.display_order ?? 0);
        if (sort === "year") return (a.year ?? 0) - (b.year ?? 0);
        const pa = effectivePrice(a, filters.locations) ?? 0;
        const pb = effectivePrice(b, filters.locations) ?? 0;
        return sort === "price_asc" ? pa - pb : pb - pa;
      });
  }, [vehicles, filters, sort, unlock, noPricing]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.type !== "all") n++;
    if (filters.brands.length) n++;
    if (filters.colors.length) n++;
    if (filters.decades.length) n++;
    if (filters.bodyTypes.length) n++;
    if (filters.categories.length) n++;
    if (filters.capacities.length) n++;
    if (filters.locations.length) n++;
    if (filters.priceMin || filters.priceMax) n++;
    if (filters.search) n++;
    return n;
  }, [filters]);

  const clearAll = () => setFilters(EMPTY_FILTERS);

  const sidebarContent = (
    <FilterPanel
      filters={filters}
      setFilters={setFilters}
      availableBrands={availableBrands}
      availableDecades={availableDecades}
      noPricing={noPricing}
    />
  );

  const unlockDateStr = unlock
    ? new Date(unlock.weddingDate + "T12:00:00").toLocaleDateString(lang === "en" ? "en-US" : "es-CO", { day: "numeric", month: "long", year: "numeric" })
    : "";
  // A personalized link (?para=...) gets the "llamativo al principio de la
  // página" treatment straight in the hero headline, not just a banner
  // further down — noPricing (productions catalog) is untouched on purpose,
  // same isolation as the rest of that catalog's split from weddings.
  const isPersonalized = !noPricing && !!unlock?.name;

  return (
    <>
      <Helmet>
        {selected ? (
          <>
            <title>{`${selected.brand}${selected.model_line ? ` ${selected.model_line}` : ""} — Camino a mi Boda`}</title>
            <meta property="og:title" content={`${selected.brand}${selected.model_line ? ` ${selected.model_line}` : ""}`} />
            <meta property="og:description" content={t("catalog.helmetDescriptionWeddings")} />
            <meta property="og:type" content="website" />
            <meta property="og:image" content={selected.photos?.find(p => p.is_visible)?.url ?? "/favicon.png"} />
          </>
        ) : noPricing ? (
          <>
            <title>{t("catalog.helmetTitleProductions")}</title>
            <meta name="description" content={t("catalog.helmetDescriptionProductions")} />
            <meta property="og:title" content={t("catalog.helmetTitleProductions")} />
            <meta property="og:description" content={t("catalog.helmetDescriptionProductions")} />
            <meta property="og:type" content="website" />
            <meta property="og:image" content="/favicon.png" />
          </>
        ) : (
          <>
            <title>{t("catalog.helmetTitleWeddings")}</title>
            <meta name="description" content={t("catalog.helmetDescriptionWeddings")} />
            <meta property="og:title" content={t("catalog.helmetTitleWeddings")} />
            <meta property="og:description" content={t("catalog.helmetDescriptionWeddings")} />
            <meta property="og:type" content="website" />
            <meta property="og:image" content="/favicon.png" />
          </>
        )}
      </Helmet>
      <HreflangTags path="/catalogo" />
      <ParallaxHero
        title={isPersonalized ? t("catalog.heroTitlePersonalized", { name: unlock?.name ?? "" }) : noPricing ? t("catalog.heroTitleProductions") : t("catalog.heroTitleWeddings")}
        subtitle={isPersonalized ? t("catalog.heroSubtitlePersonalized", { fecha: unlockDateStr }) : noPricing ? t("catalog.heroSubtitleProductions") : t("catalog.heroSubtitleWeddings")}
      >
        <div className="flex items-center justify-center gap-6 sm:gap-10 mt-6">
          <div className="text-center">
            <p className="text-2xl sm:text-3xl font-bold text-white drop-shadow">{t("comoFunciona.trustExperienceYears")}</p>
            <p className="text-xs sm:text-sm text-white/70 uppercase tracking-wide">{t("comoFunciona.trustExperienceLabel")}</p>
          </div>
          <div className="w-px h-10 bg-white/30" />
          <div className="text-center">
            <p className="text-2xl sm:text-3xl font-bold text-white drop-shadow">{t("comoFunciona.trustEventsCount")}</p>
            <p className="text-xs sm:text-sm text-white/70 uppercase tracking-wide">{t("comoFunciona.trustEventsLabel")}</p>
          </div>
        </div>
      </ParallaxHero>
      <div className="space-y-8">
        {/* Free availability check — moved here from the bottom of the page
            (mejoras.md ítem 1: "selector de fecha global arriba del
            catálogo"), and now actually queries real reservations instead
            of just building a WhatsApp message. */}
        {!noPricing && !loading && !error && (
          <div className="max-w-lg mx-auto w-full">
            <AvailabilityWidget
              date={checkDate}
              onDateChange={setCheckDate}
              loading={availabilityLoading}
              availableCount={checkDate ? vehicles.filter(v => !unavailableIds.has(v.id) && !picoYPlacaIds.has(v.id)).length : undefined}
              totalCount={checkDate ? vehicles.length : undefined}
            />
          </div>
        )}

        {!noPricing && unlock && !loading && !error && (
          <div className="flex items-center justify-between gap-3 bg-brand-50 border border-brand-100 rounded-xl px-4 py-2.5 sm:px-6 sm:py-4 text-sm">
            <div>
              <span className="text-gray-700 font-medium">
                {t("catalog.estimatedPricesFor")}{" "}
                {unlockDateStr}
              </span>
              <p className="text-xs text-gray-500 mt-0.5">{t("catalog.priceHint")}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => setGateOpen(true)}
                className="text-brand-700 hover:text-brand-800 font-semibold cursor-pointer"
              >
                {t("catalog.changeDate")}
              </button>
              <button
                onClick={() => { clearUnlock(); setUnlockState(null); }}
                className="text-gray-400 hover:text-gray-600 text-xs cursor-pointer"
              >
                {t("catalog.removeDate")}
              </button>
            </div>
          </div>
        )}

        {loading && (
          <SkeletonGroup label={t("common.loading")} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <VehicleCardSkeleton key={i} />
            ))}
          </SkeletonGroup>
        )}

        {!loading && error && (
          <div className="text-center py-20 text-gray-500">
            <p>{t("catalog.loadError")}</p>
          </div>
        )}

        {!loading && !error && (
          <div className="flex gap-8 items-start">
            {/* Sidebar — desktop only */}
            <aside className="hidden md:block w-56 shrink-0 sticky top-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-2">
                <div className="flex items-center justify-between py-3 border-b border-gray-100 mb-1">
                  <p className="text-sm font-semibold text-gray-800">{t("catalog.filters")}</p>
                  {activeFilterCount > 0 && (
                    <button
                      onClick={clearAll}
                      className="text-xs text-brand-700 hover:text-brand-800 cursor-pointer"
                    >
                      {t("catalog.clear")}
                    </button>
                  )}
                </div>
                {sidebarContent}
              </div>
            </aside>

            {/* Main content */}
            <div className="flex-1 min-w-0 space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                <input
                  type="text"
                  value={filters.search}
                  onChange={e => setFilters({ ...filters, search: e.target.value })}
                  placeholder={t("catalog.searchPlaceholder")}
                  className="w-full pl-9 pr-8 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                {filters.search && (
                  <button
                    onClick={() => setFilters({ ...filters, search: "" })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Search suggestions — only while the box is empty, so they
                  read as "try this" rather than crowding real results. */}
              {!filters.search && searchSuggestions.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 -mt-2">
                  <span className="text-xs text-gray-400">{t("catalog.searchSuggestionsLabel")}</span>
                  {searchSuggestions.map(s => (
                    <button
                      key={s}
                      onClick={() => setFilters({ ...filters, search: s })}
                      className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 hover:bg-brand-50 hover:text-brand-600 transition-colors cursor-pointer"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              <FavoritesBar
                favoriteVehicles={favoriteVehicles}
                onRemove={toggleFavorite}
                onClearAll={() => favoriteVehicles.forEach(v => toggleFavorite(v.id))}
              />

              {/* Top bar */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-sm text-gray-400">
                  {filtered.length} {filtered.length !== 1 ? t("catalog.vehicleCountOther") : t("catalog.vehicleCountOne")}
                  {activeFilterCount > 0 && (
                    <button
                      onClick={clearAll}
                      className="ml-2 text-brand-700 hover:text-brand-800 cursor-pointer underline text-xs hidden md:inline"
                    >
                      {t("catalog.clearFilters")}
                    </button>
                  )}
                </p>
                <select
                  value={sort}
                  onChange={e => setSort(e.target.value as SortKey)}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
                >
                  <option value="default">{t("catalog.sortDefault")}</option>
                  <option value="year">{t("catalog.sortOldest")}</option>
                  {!noPricing && <option value="price_asc">{t("catalog.sortPriceAsc")}</option>}
                  {!noPricing && <option value="price_desc">{t("catalog.sortPriceDesc")}</option>}
                </select>
              </div>

              {/* Empty state */}
              {filtered.length === 0 && (
                <div className="text-center py-16 text-gray-400 space-y-3">
                  <p className="text-lg">{t("catalog.emptyState")}</p>
                  <button onClick={clearAll} className="text-brand-700 hover:text-brand-800 text-sm underline cursor-pointer">
                    {t("catalog.seeAll")}
                  </button>
                </div>
              )}

              {/* Grid */}
              {filtered.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                  {filtered.map(v => (
                    <VehicleCard
                      key={v.id}
                      vehicle={v}
                      onClick={() => (noPricing ? openVehicle(v) : goToVehicle(v))}
                      unlock={unlock}
                      onRequestUnlock={() => setGateOpen(true)}
                      hidePricing={noPricing}
                      availability={
                        !checkDate
                          ? undefined
                          : unavailableIds.has(v.id)
                            ? "unavailable"
                            : picoYPlacaIds.has(v.id)
                              ? "pico_y_placa"
                              : "available"
                      }
                      previewDate={checkDate || undefined}
                      isFavorite={favorites.has(v.id)}
                      onToggleFavorite={() => toggleFavorite(v.id)}
                    />
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
            {t("catalog.filters")}
            {activeFilterCount > 0 && (
              <span className="bg-white text-brand-700 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Mobile drawer (fila 50) — migrated to <Modal>, which already IS a
          bottom sheet on mobile (the only width this ever opens at — its
          one trigger is md:hidden, so Modal's centered-desktop mode is
          never reached in practice). Gains Escape/swipe-to-dismiss/body-
          scroll-lock it didn't have before. */}
      {mobileDrawerOpen && (
        <Modal
          title={t("catalog.filters")}
          onClose={() => setMobileDrawerOpen(false)}
          closeAriaLabel={t("vehicleModal.close")}
          headerExtra={activeFilterCount > 0 && (
            <button onClick={clearAll} className="text-sm text-brand-700 cursor-pointer whitespace-nowrap">
              {t("catalog.clear")}
            </button>
          )}
          footer={
            <button
              onClick={() => setMobileDrawerOpen(false)}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-xl transition-colors cursor-pointer"
            >
              {t("catalog.seeVehicles", { count: filtered.length, plural: filtered.length !== 1 ? "s" : "" })}
            </button>
          }
        >
          {sidebarContent}
        </Modal>
      )}

      {selected && (
        <VehicleModal
          vehicle={selected}
          onClose={closeVehicle}
          unlock={unlock}
          onRequestUnlock={() => setGateOpen(true)}
          hidePricing={noPricing}
        />
      )}

      {gateOpen && (
        <RevealPricesModal
          onClose={() => setGateOpen(false)}
          initial={unlock ?? undefined}
          onUnlocked={() => {
            setUnlockState(getUnlock());
            setGateOpen(false);
          }}
        />
      )}

      {/* Instagram grid */}
      <div className="mt-16">
        <InstagramGrid />
      </div>

      {/* Floristería aliada */}
      <div className="mt-16">
        <FloristAllySection />
      </div>

      {/* Reviews section — last, right before the footer (PublicLayout renders
          it immediately after this component's content) */}
      {reviews.length > 0 && (
        <div id="opiniones" className="mt-16 space-y-6 scroll-mt-24">
          <h2 className="text-2xl font-brand text-brand-500 text-center">{t("catalog.reviewsTitle")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {reviews.map(r => (
              <div key={r.id} className="relative bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
                <AdminEditLink to={`/admin/opiniones?edit=${r.id}`} className="absolute top-2 right-2" />
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} size={14} className={s <= r.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'} />
                  ))}
                  {r.source === 'google' && (
                    <span className="ml-auto text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">Google</span>
                  )}
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">"{pickLocalized(r.body, r.body_en).trim()}"</p>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{r.author_name}</p>
                    {r.event_date && (
                      <p className="text-xs text-gray-400">{new Date(r.event_date + 'T12:00:00').toLocaleDateString(lang === "en" ? "en-US" : 'es-CO', { month: 'long', year: 'numeric' })}</p>
                    )}
                  </div>
                  {lang === "en" && !r.body_en && (
                    <span className="text-[10px] text-gray-400 italic shrink-0">{t("vehiclePage.shownInSpanish")}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
