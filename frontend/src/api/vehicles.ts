import type { Vehicle, VehicleListItem, VehicleLocation, VehiclePhoto, VehicleStatus, VehicleType } from "../types/vehicle";
import { api } from "./index";

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
};

