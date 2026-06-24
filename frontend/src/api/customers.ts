import { api } from "./index";
import type { Customer } from "../types/customer";

export const customersApi = {
  list: (search?: string) =>
    api.get<Customer[]>("/api/customers", { params: search ? { search } : {} }),
  get: (id: number) => api.get<Customer>(`/api/customers/${id}`),
  create: (data: Record<string, unknown>) => api.post<Customer>("/api/customers", data),
  update: (id: number, data: Record<string, unknown>) => api.put<Customer>(`/api/customers/${id}`, data),
  delete: (id: number) => api.delete(`/api/customers/${id}`),
};
