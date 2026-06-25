import { api } from './index';
import type { Reservation, ReservationListItem, ReservationStatus } from '../types/reservation';

const base = '/reservations';

export const reservationsApi = {
  list: (status?: ReservationStatus) =>
    api.get<ReservationListItem[]>(base, { params: status ? { status } : {} }),

  get: (id: number) => api.get<Reservation>(`${base}/${id}`),

  create: (data: Record<string, unknown>) => api.post<Reservation>(base, data),

  update: (id: number, data: Record<string, unknown>) =>
    api.put<Reservation>(`${base}/${id}`, data),

  delete: (id: number) => api.delete(`${base}/${id}`),

  createFromQuote: (quoteId: number) =>
    api.post<Reservation>(`${base}/from-quote/${quoteId}`),
};
