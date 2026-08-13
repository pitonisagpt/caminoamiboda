import type { PublicVehicleListItem } from "../types/vehicle";
import type { PriceUnlock } from "./priceUnlock";

export function buildAvailabilityMessage(vehicle: PublicVehicleListItem, unlock?: PriceUnlock | null): string {
  const details = [vehicle.color, vehicle.body_type && vehicle.body_type !== "NA" ? vehicle.body_type : null]
    .filter(Boolean)
    .join(" ");
  const dateStr = unlock?.weddingDate
    ? ` para el ${new Date(unlock.weddingDate + "T12:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })}`
    : "";
  const link = `${window.location.origin}/vehiculos/${vehicle.id}${unlock?.weddingDate ? `?fecha=${unlock.weddingDate}` : ""}`;

  return [
    `Hola! Me interesa el ${vehicle.brand}${vehicle.model_line ? ` ${vehicle.model_line}` : ""}${details ? ` ${details}` : ""}${dateStr}. ¿Está disponible?`,
    "",
    `Código: ${vehicle.sku}`,
    `Ver vehículo: ${link}`,
  ].join("\n");
}
