import { api } from "./index";
import type { Driver, DriverStatus } from "../types/driver";

export const driversApi = {
  list: (params?: { status?: DriverStatus; search?: string }) =>
    api.get<Driver[]>("/api/drivers", { params }),
  get: (id: number) => api.get<Driver>(`/api/drivers/${id}`),
  create: (data: Record<string, unknown>) => api.post<Driver>("/api/drivers", data),
  update: (id: number, data: Record<string, unknown>) => api.put<Driver>(`/api/drivers/${id}`, data),
  delete: (id: number) => api.delete(`/api/drivers/${id}`),
};
