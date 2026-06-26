import { api } from './index';
import type { Contact, ContactStatus, ContactType } from '../types/contact';

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
};
