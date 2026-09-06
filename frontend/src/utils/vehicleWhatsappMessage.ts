import type { PublicVehicleListItem } from "../types/vehicle";
import type { PriceUnlock } from "./priceUnlock";
import type { Lang } from "../i18n/langPath";
import type { TranslationKey } from "../i18n/es";

type TFunction = (key: TranslationKey, vars?: Record<string, string | number>) => string;

export function buildAvailabilityMessage(
  vehicle: PublicVehicleListItem,
  unlock: PriceUnlock | null | undefined,
  t: TFunction,
  lang: Lang
): string {
  const details = [vehicle.color, vehicle.body_type && vehicle.body_type !== "NA" ? vehicle.body_type : null]
    .filter(Boolean)
    .join(" ");
  const vehicleName = `${vehicle.brand}${vehicle.model_line ? ` ${vehicle.model_line}` : ""}${details ? ` ${details}` : ""}`;
  const dateStr = unlock?.weddingDate
    ? t("catalog.waAvailabilityMessageDate", {
        date: new Date(unlock.weddingDate + "T12:00:00").toLocaleDateString(lang === "en" ? "en-US" : "es-CO", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
      })
    : "";
  // Public catalog link — this message is composed on the customer's own
  // device before they send it, so it must never point at an internal
  // /vehiculos/:id admin route (login-walled, staff-only UI).
  const link = `${window.location.origin}/catalogo?vehiculo=${vehicle.id}${unlock?.weddingDate ? `&fecha=${unlock.weddingDate}` : ""}`;

  return [
    t("catalog.waAvailabilityMessage", { vehicle: vehicleName, date: dateStr }),
    "",
    t("catalog.waAvailabilityMessageCode", { sku: vehicle.sku }),
    t("catalog.waAvailabilityMessageLink", { link }),
  ].join("\n");
}
