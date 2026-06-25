import { api } from "./index";
import type { VehicleOwner } from "../types/vehicleOwner";

export const vehicleOwnersApi = {
  list: (search?: string) =>
    api.get<VehicleOwner[]>("/vehicle-owners", { params: search ? { search } : {} }),
  get: (id: number) => api.get<VehicleOwner>(`/vehicle-owners/${id}`),
  create: (data: Record<string, unknown>) => api.post<VehicleOwner>("/vehicle-owners", data),
  update: (id: number, data: Record<string, unknown>) => api.put<VehicleOwner>(`/vehicle-owners/${id}`, data),
  delete: (id: number) => api.delete(`/vehicle-owners/${id}`),
};
