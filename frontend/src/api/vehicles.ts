import type { Vehicle, VehicleListItem, VehicleLocation, VehiclePhoto, VehicleStatus, VehicleType } from "../types/vehicle";
import { api } from "./index";

export interface VehicleStatsSummary {
  total_events: number;
  completed_events: number;
  upcoming_count: number;
  total_revenue: number;
  company_share: number;
  avg_revenue_per_event: number;
  first_event_date: string | null;
  last_event_date: string | null;
}

export interface VehicleStatsResponse {
  summary: VehicleStatsSummary;
  monthly_trend: { month: string; revenue: number; count: number }[];
  status_breakdown: { status: string; label: string; count: number }[];
  seasonality: { month: number; label: string; count: number }[];
  recent_events: {
    id: number;
    reservation_number: string;
    title: string;
    date: string;
    status: string;
    total_amount: number;
  }[];
}

interface ListParams {
  status?: VehicleStatus;
  location?: VehicleLocation;
  vehicle_type?: VehicleType;
}

export const vehiclesApi = {
  list(params?: ListParams) {
    return api.get<VehicleListItem[]>("/vehicles", { params });
  },

  listAll(params?: ListParams) {
    return api.get<VehicleListItem[]>("/vehicles/all", { params });
  },

  get(id: number) {
    return api.get<Vehicle>(`/vehicles/${id}`);
  },

  create(data: Record<string, unknown>) {
    return api.post<Vehicle>("/vehicles", data);
  },

  update(id: number, data: Record<string, unknown>) {
    return api.put<Vehicle>(`/vehicles/${id}`, data);
  },

  deactivate(id: number) {
    return api.delete(`/vehicles/${id}`);
  },

  reorder(items: { id: number; display_order: number }[]) {
    return api.put<{ ok: boolean }>("/vehicles/reorder", items);
  },

  uploadPhotos(vehicleId: number, files: File[]) {
    const form = new FormData();
    files.forEach((f) => form.append("files", f));
    return api.post<VehiclePhoto[]>(`/vehicles/${vehicleId}/photos`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  updatePhotos(vehicleId: number, photos: { id: number; display_order: number; is_visible: boolean }[]) {
    return api.put<VehiclePhoto[]>(`/vehicles/${vehicleId}/photos`, { photos });
  },

  deletePhoto(vehicleId: number, photoId: number) {
    return api.delete(`/vehicles/${vehicleId}/photos/${photoId}`);
  },

  stats(id: number, params?: { date_from?: string | null; date_to?: string | null }) {
    return api.get<VehicleStatsResponse>(`/vehicles/${id}/stats`, { params: params ?? {} });
  },
};

