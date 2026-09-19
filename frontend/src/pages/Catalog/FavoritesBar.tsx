import { Heart, X } from "lucide-react";
import type { PublicVehicleListItem } from "../../types/vehicle";
import { useLang } from "../../i18n/LanguageContext";
import { whatsAppLinkProps } from "../../utils/whatsapp";
import { WhatsAppIcon } from "../../components/WhatsAppIcon";
import { buildFavoritesMessage } from "../../utils/favoritesWhatsappMessage";

const WHATSAPP_NUMBER = "573147372030";

/** "Enviar mi selección por WhatsApp" (mejoras.md ítem 9) — shown only
 * once at least one vehicle is favorited (see useFavorites). Deliberately
 * inline in the page flow, not a floating button — the catalog already
 * has three fixed-position elements (WhatsApp, IA chat, mobile Filtros)
 * competing for corners on a 390px viewport (see PublicLayout.tsx); a
 * fourth would need the same collision-avoidance work those already went
 * through, for a bar that's only relevant once the visitor has favorited
 * something anyway. */
export default function FavoritesBar({
  favoriteVehicles,
  onRemove,
  onClearAll,
}: {
  favoriteVehicles: PublicVehicleListItem[];
  onRemove: (vehicleId: number) => void;
  onClearAll: () => void;
}) {
  const { t } = useLang();
  if (favoriteVehicles.length === 0) return null;

  const whatsappMsg = encodeURIComponent(buildFavoritesMessage(favoriteVehicles, t));

  return (
    <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 shrink-0">
        <Heart size={15} className="fill-red-500 text-red-500" />
        {t(favoriteVehicles.length === 1 ? "catalog.favoriteCountOne" : "catalog.favoriteCountOther", { count: favoriteVehicles.length })}
      </div>

      <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
        {favoriteVehicles.map(v => (
          <span
            key={v.id}
            className="flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600"
          >
            {v.brand}{v.model_line ? ` ${v.model_line}` : ""}
            <button
              onClick={() => onRemove(v.id)}
              aria-label={t("catalog.unfavoriteAria")}
              className="p-0.5 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X size={11} />
            </button>
          </span>
        ))}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onClearAll}
          className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
        >
          {t("catalog.clear")}
        </button>
        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMsg}`}
          {...whatsAppLinkProps()}
          className="flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
        >
          <WhatsAppIcon className="w-3.5 h-3.5" />
          {t("catalog.sendFavoritesWhatsapp")}
        </a>
      </div>
    </div>
  );
}
