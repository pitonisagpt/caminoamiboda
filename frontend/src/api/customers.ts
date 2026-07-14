import { api } from "./index";
import type { Customer } from "../types/customer";

export const customersApi = {
  list: (search?: string) =>
    api.get<Customer[]>("/customers", { params: search ? { search } : {} }),
  get: (id: number) => api.get<Customer>(`/customers/${id}`),
  create: (data: Record<string, unknown>) => api.post<Customer>("/customers", data),
  update: (id: number, data: Record<string, unknown>) => api.put<Customer>(`/customers/${id}`, data),
  delete: (id: number) => api.delete(`/customers/${id}`),
  whatsappText: (id: number) => api.get<{ text: string }>(`/customers/${id}/whatsapp-text`),
};
