import { api } from './index';
import type { ReservationAddon, ReservationAddonForm } from '../types/reservationAddon';

export interface ReservationAddonPayment {
  id: number;
  addon_id: number;
  amount: number;
  paid_at: string;
  notes: string | null;
  created_at: string;
}

export const reservationAddonsApi = {
  list: (reservationId: number) =>
    api.get<ReservationAddon[]>(`/reservations/${reservationId}/addons`),

  create: (reservationId: number, data: ReservationAddonForm) =>
    api.post<ReservationAddon>(`/reservations/${reservationId}/addons`, data),

  update: (reservationId: number, addonId: number, data: Partial<ReservationAddonForm>) =>
    api.put<ReservationAddon>(`/reservations/${reservationId}/addons/${addonId}`, data),

  delete: (reservationId: number, addonId: number) =>
    api.delete(`/reservations/${reservationId}/addons/${addonId}`),

  listPayments: (reservationId: number, addonId: number) =>
    api.get<ReservationAddonPayment[]>(`/reservations/${reservationId}/addons/${addonId}/payments`),

  addPayment: (reservationId: number, addonId: number, data: { amount: number; paid_at: string; notes?: string }) =>
    api.post<ReservationAddonPayment>(`/reservations/${reservationId}/addons/${addonId}/payments`, data),

  deletePayment: (reservationId: number, addonId: number, paymentId: number) =>
    api.delete(`/reservations/${reservationId}/addons/${addonId}/payments/${paymentId}`),
};
