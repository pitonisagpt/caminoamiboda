import { api } from "./index";
import type { PhotoProvider } from "../types/vehicle";

export const photoProvidersApi = {
  list: (params?: { search?: string }) => api.get<PhotoProvider[]>("/photo-providers", { params }),
  create: (data: Record<string, unknown>) => api.post<PhotoProvider>("/photo-providers", data),
  update: (id: number, data: Record<string, unknown>) => api.put<PhotoProvider>(`/photo-providers/${id}`, data),
  delete: (id: number) => api.delete(`/photo-providers/${id}`),
};
