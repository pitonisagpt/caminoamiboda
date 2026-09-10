import { api } from './index';
import type { Reservation, ReservationPage, ReservationStatus } from '../types/reservation';

const base = '/reservations';

export type PaymentType = 'cash' | 'withholding';

export interface ReservationPayment {
  id: number;
  reservation_id: number;
  amount: number;
  paid_at: string;
  notes: string | null;
  payment_type: PaymentType;
  withholding_percentage: number | null;
  created_at: string;
}

export interface ReservationListParams {
  status?: string;
  event_category?: string;
  vehicle_category?: string;
  vehicle_id?: number;
  contact_id?: number;
  location_id?: number;
  needs_gcal_review?: boolean;
  gcal_imported?: boolean;
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

  updateStatus: (id: number, status: ReservationStatus) =>
    api.put<Reservation>(`${base}/${id}`, { status }),

  // Freezes/unfreezes this reservation's Google Calendar sync (admin-only
  // on the backend). Unfreezing refreshes the previously-frozen fields and
  // pushes immediately — see set_timeline_gcal_imported in reservations.py.
  setTimelineGcalImported: (id: number, gcal_imported: boolean) =>
    api.patch<Reservation>(`${base}/${id}/timeline-gcal-imported`, { gcal_imported }),

  delete: (id: number) => api.delete(`${base}/${id}`),

  createFromQuote: (quoteId: number) =>
    api.post<Reservation>(`${base}/from-quote/${quoteId}`),

  listPayments: (id: number) =>
    api.get<ReservationPayment[]>(`${base}/${id}/payments`),

  addPayment: (id: number, data: { amount: number; paid_at: string; notes?: string; payment_type?: PaymentType; withholding_percentage?: number | null }) =>
    api.post<ReservationPayment>(`${base}/${id}/payments`, data),

  deletePayment: (reservationId: number, paymentId: number) =>
    api.delete(`${base}/${reservationId}/payments/${paymentId}`),
};
