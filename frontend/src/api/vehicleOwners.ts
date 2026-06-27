import { api } from "./index";
import type { VehicleOwner } from "../types/vehicleOwner";

export type VehicleOwnerBasic = { id: number; full_name: string; phone: string | null; whatsapp: string | null };

export const vehicleOwnersApi = {
  listBasic: () => api.get<VehicleOwnerBasic[]>("/vehicle-owners/basic"),
  list: (search?: string) =>
    api.get<VehicleOwner[]>("/vehicle-owners", { params: search ? { search } : {} }),
  get: (id: number) => api.get<VehicleOwner>(`/vehicle-owners/${id}`),
  create: (data: Record<string, unknown>) => api.post<VehicleOwner>("/vehicle-owners", data),
  update: (id: number, data: Record<string, unknown>) => api.put<VehicleOwner>(`/vehicle-owners/${id}`, data),
  delete: (id: number) => api.delete(`/vehicle-owners/${id}`),
};
