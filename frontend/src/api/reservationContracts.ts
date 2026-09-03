import { api } from './index';
import type { ReservationContract, PaymentScheduleItem } from '../types/reservationContract';

export const reservationContractsApi = {
  get: (reservationId: number) =>
    api.get<ReservationContract>(`/reservations/${reservationId}/contract`),

  getOrCreate: (reservationId: number) =>
    api.post<ReservationContract>(`/reservations/${reservationId}/contract`),

  update: (reservationId: number, data: Partial<ReservationContract>) =>
    api.put<ReservationContract>(`/reservations/${reservationId}/contract`, data),

  generatePdf: (reservationId: number) =>
    api.post<ReservationContract>(`/reservations/${reservationId}/contract/generate-pdf`),

  downloadPdf: async (reservationId: number, contractNumber: string) => {
    const res = await api.get(`/reservations/${reservationId}/contract/pdf`, { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${contractNumber}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  },

  listPaymentSchedule: (reservationId: number) =>
    api.get<PaymentScheduleItem[]>(`/reservations/${reservationId}/payment-schedule`),

  addPaymentScheduleItem: (
    reservationId: number,
    data: { description: string; percentage?: number; fixed_amount?: number }
  ) => api.post<PaymentScheduleItem>(`/reservations/${reservationId}/payment-schedule`, data),

  deletePaymentScheduleItem: (reservationId: number, itemId: number) =>
    api.delete(`/reservations/${reservationId}/payment-schedule/${itemId}`),
};
