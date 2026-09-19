import { api } from "./index";

export interface AvailabilityResponse {
  date: string;
  unavailable_vehicle_ids: number[];
  /** Vehicles that can't legally be driven on this specific date because it
   * falls on their pico y placa weekday (and it isn't a festivo, which
   * suspends the restriction) — distinct from unavailable_vehicle_ids,
   * which is only actual booking conflicts. */
  pico_y_placa_vehicle_ids: number[];
}

export const availabilityApi = {
  forDate: (date: string) =>
    api.get<AvailabilityResponse>("/public/availability", { params: { date } }),
};
