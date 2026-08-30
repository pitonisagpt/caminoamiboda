import { api } from './index';
import type { ReservationAddon, ReservationAddonForm } from '../types/reservationAddon';

export const reservationAddonsApi = {
  list: (reservationId: number) =>
    api.get<ReservationAddon[]>(`/reservations/${reservationId}/addons`),

  create: (reservationId: number, data: ReservationAddonForm) =>
    api.post<ReservationAddon>(`/reservations/${reservationId}/addons`, data),

  update: (reservationId: number, addonId: number, data: Partial<ReservationAddonForm>) =>
    api.put<ReservationAddon>(`/reservations/${reservationId}/addons/${addonId}`, data),

  delete: (reservationId: number, addonId: number) =>
    api.delete(`/reservations/${reservationId}/addons/${addonId}`),
};
