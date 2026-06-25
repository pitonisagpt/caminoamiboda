import axios from 'axios';
import type { Reservation, ReservationListItem, ReservationStatus } from '../types/reservation';

const base = '/api/reservations';

export const reservationsApi = {
  list: (status?: ReservationStatus) =>
    axios.get<ReservationListItem[]>(base, { params: status ? { status } : {} }),

  get: (id: number) => axios.get<Reservation>(`${base}/${id}`),

  create: (data: Record<string, unknown>) => axios.post<Reservation>(base, data),

  update: (id: number, data: Record<string, unknown>) =>
    axios.put<Reservation>(`${base}/${id}`, data),

  delete: (id: number) => axios.delete(`${base}/${id}`),

  createFromQuote: (quoteId: number) =>
    axios.post<Reservation>(`${base}/from-quote/${quoteId}`),
};
