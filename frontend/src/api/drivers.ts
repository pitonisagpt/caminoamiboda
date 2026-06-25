import { api } from "./index";
import type { Driver, DriverStatus } from "../types/driver";

export const driversApi = {
  list: (params?: { status?: DriverStatus; search?: string }) =>
    api.get<Driver[]>("/drivers", { params }),
  get: (id: number) => api.get<Driver>(`/drivers/${id}`),
  create: (data: Record<string, unknown>) => api.post<Driver>("/drivers", data),
  update: (id: number, data: Record<string, unknown>) => api.put<Driver>(`/drivers/${id}`, data),
  delete: (id: number) => api.delete(`/drivers/${id}`),
};
