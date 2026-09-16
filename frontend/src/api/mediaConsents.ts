import { api } from './index';
import type { MediaConsent } from '../types/mediaConsent';

export const mediaConsentsApi = {
  get: (reservationId: number) =>
    api.get<MediaConsent>(`/reservations/${reservationId}/media-consent`),

  getOrCreate: (reservationId: number) =>
    api.post<MediaConsent>(`/reservations/${reservationId}/media-consent`),

  update: (reservationId: number, data: Partial<MediaConsent>) =>
    api.put<MediaConsent>(`/reservations/${reservationId}/media-consent`, data),

  generatePdf: (reservationId: number) =>
    api.post<MediaConsent>(`/reservations/${reservationId}/media-consent/generate-pdf`),

  downloadPdf: async (reservationId: number, consentNumber: string) => {
    const res = await api.get(`/reservations/${reservationId}/media-consent/pdf`, { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${consentNumber}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
