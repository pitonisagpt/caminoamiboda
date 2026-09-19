import { api } from "./index";

export interface AvailabilityResponse {
  date: string;
  unavailable_vehicle_ids: number[];
}

export const availabilityApi = {
  forDate: (date: string) =>
    api.get<AvailabilityResponse>("/public/availability", { params: { date } }),
};
