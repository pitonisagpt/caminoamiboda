import { api } from './index';
import type { AttachmentCategory, ReservationAttachment } from '../types/reservationAttachment';

export const reservationAttachmentsApi = {
  list: (reservationId: number) =>
    api.get<ReservationAttachment[]>(`/reservations/${reservationId}/attachments`),

  upload: (reservationId: number, files: File[], category: AttachmentCategory) => {
    const form = new FormData();
    files.forEach(f => form.append('files', f));
    form.append('category', category);
    return api.post<ReservationAttachment[]>(`/reservations/${reservationId}/attachments`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  delete: (reservationId: number, attachmentId: number) =>
    api.delete(`/reservations/${reservationId}/attachments/${attachmentId}`),
};
