import type { PublicVehicleListItem } from "../types/vehicle";
import type { TranslationKey } from "../i18n/es";
import { vehicleSlugPath } from "./slug";

type TFunction = (key: TranslationKey, vars?: Record<string, string | number>) => string;

/** "Enviar mi selección por WhatsApp" (mejoras.md ítem 9 — the lighter
 * alternative to a full side-by-side "Comparar" UI). Same plain,
 * no-emoji style as vehicleWhatsappMessage.ts's buildAvailabilityMessage —
 * this message is composed on the visitor's own device before they send
 * it, so it links to the real public /carros/<slug> pages, never an
 * internal admin route. */
export function buildFavoritesMessage(vehicles: PublicVehicleListItem[], t: TFunction): string {
  const lines = vehicles.map(v => {
    const name = `${v.brand}${v.model_line ? ` ${v.model_line}` : ""}`;
    const link = `${window.location.origin}/carros/${vehicleSlugPath(v)}`;
    return `- ${name}: ${link}`;
  });

  return [
    t("catalog.waFavoritesMessage", { count: vehicles.length }),
    "",
    ...lines,
    "",
    t("catalog.waFavoritesMessageClosing"),
  ].join("\n");
}
