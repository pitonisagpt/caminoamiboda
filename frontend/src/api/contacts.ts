import { api } from './index';
import type { Contact, ContactStatus, ContactType } from '../types/contact';

export interface ContactStatsSummary {
  total_events: number;
  completed_events: number;
  upcoming_count: number;
  total_revenue: number;
  avg_revenue_per_event: number;
  deposits_received: number;
  outstanding_balance: number;
  first_event_date: string | null;
  last_event_date: string | null;
}

export interface ContactStatsResponse {
  summary: ContactStatsSummary;
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
  upcoming_events: {
    id: number;
    reservation_number: string;
    title: string;
    date: string;
    status: string;
    total_amount: number;
  }[];
}

export const contactsApi = {
  list: (params?: { search?: string; contact_type?: ContactType; status?: ContactStatus }) =>
    api.get<Contact[]>('/contacts', { params }),

  get: (id: number) => api.get<Contact>(`/contacts/${id}`),

  create: (data: Record<string, unknown>) => api.post<Contact>('/contacts', data),

  update: (id: number, data: Record<string, unknown>) =>
    api.put<Contact>(`/contacts/${id}`, data),

  delete: (id: number) => api.delete(`/contacts/${id}`),

  markContacted: (id: number) =>
    api.patch<Contact>(`/contacts/${id}/last-contacted`),

  stats: (id: number, params?: { date_from?: string | null; date_to?: string | null }) =>
    api.get<ContactStatsResponse>(`/contacts/${id}/stats`, { params: params ?? {} }),
};
