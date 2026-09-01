import type { TranslationKey } from "./es";
import type { VehicleCategory } from "../types/vehicle";

/**
 * English display labels for values whose source of truth (and Spanish
 * label) lives in `components/vehicleFilterKit.tsx` or come straight from
 * the backend — that file/those values are shared with the admin vehicle
 * form, which stays Spanish, so the public catalog/vehicle card/modal keep
 * their own label lookup here instead, keyed by the same underlying value.
 */
export const CATEGORY_LABEL_KEY: Record<VehicleCategory, TranslationKey> = {
  clasico: "catalog.categoryClasico",
  vintage: "catalog.categoryVintage",
  moderno: "catalog.categoryModerno",
};

export const BODY_TYPE_LABEL_KEY: Record<string, TranslationKey> = {
  "Convertible": "catalog.bodyTypeConvertible",
  "Hardtop": "catalog.bodyTypeHardtop",
  "Semi Descapotable": "catalog.bodyTypeSemiDescapotable",
  "Sidecar": "catalog.bodyTypeSidecar",
};

export const LOCATION_LABEL_KEY: Record<string, TranslationKey> = {
  medellin: "catalog.locationMedellin",
  rionegro: "catalog.locationRionegro",
  carmen_de_viboral: "catalog.locationCarmenDeViboral",
};

// pico_y_placa_day comes back from the backend as a Spanish weekday name
// (e.g. "Lunes") regardless of UI language — this maps it to a display key.
export const PICO_DAY_LABEL_KEY: Record<string, TranslationKey> = {
  Lunes: "vehicleModal.dayMonday",
  Martes: "vehicleModal.dayTuesday",
  Miércoles: "vehicleModal.dayWednesday",
  Jueves: "vehicleModal.dayThursday",
  Viernes: "vehicleModal.dayFriday",
};
