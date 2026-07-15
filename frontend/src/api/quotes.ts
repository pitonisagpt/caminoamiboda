import { api } from './index';
import type { Quote, QuoteListItem, QuoteStatus } from '../types/quote';

export const quotesApi = {
  list: (status?: QuoteStatus) =>
    api.get<QuoteListItem[]>('/quotes', { params: status ? { status } : {} }),

  get: (id: number) => api.get<Quote>(`/quotes/${id}`),

  create: (data: Record<string, unknown>) => api.post<Quote>('/quotes', data),

  update: (id: number, data: Record<string, unknown>) =>
    api.put<Quote>(`/quotes/${id}`, data),

  delete: (id: number) => api.delete(`/quotes/${id}`),

  generatePdf: (id: number) => api.post<Quote>(`/quotes/${id}/generate-pdf`),

  fetchPdfBlob: async (id: number): Promise<string> => {
    const res = await api.get(`/quotes/${id}/pdf`, { responseType: 'blob' });
    return URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
  },

  downloadPdf: async (id: number, quoteNumber: string) => {
    const url = await quotesApi.fetchPdfBlob(id);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${quoteNumber}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  },

  getWhatsappText: (id: number) =>
    api.get<{ text: string }>(`/quotes/${id}/whatsapp-text`),

  convertToReservation: (id: number) =>
    api.post<{ id: number; reservation_number: string }>(`/quotes/${id}/convert-to-reservation`),
};
