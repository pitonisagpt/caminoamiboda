import { api } from './index';
import type { Reservation, ReservationPage, ReservationStatus } from '../types/reservation';

const base = '/reservations';

export interface ReservationListParams {
  status?: ReservationStatus;
  event_category?: string;
  search?: string;
  sort_by?: string;
  sort_dir?: 'asc' | 'desc';
  page?: number;
  page_size?: number;
  date_from?: string;
  date_to?: string;
}

export const reservationsApi = {
  list: (params: ReservationListParams = {}) =>
    api.get<ReservationPage>(base, { params }),

  get: (id: number) => api.get<Reservation>(`${base}/${id}`),

  create: (data: Record<string, unknown>) => api.post<Reservation>(base, data),

  update: (id: number, data: Record<string, unknown>) =>
    api.put<Reservation>(`${base}/${id}`, data),

  delete: (id: number) => api.delete(`${base}/${id}`),

  createFromQuote: (quoteId: number) =>
    api.post<Reservation>(`${base}/from-quote/${quoteId}`),
};
