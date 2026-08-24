import { api } from './index';
import type { ServiceOrder } from '../types/serviceOrder';

export const serviceOrdersApi = {
  list: () => api.get<ServiceOrder[]>('/service-orders'),

  get: (id: number) => api.get<ServiceOrder>(`/service-orders/${id}`),

  create: (data: { reservation_id: number; vehicle_id?: number; owner_id?: number; owner_percentage?: number; notes?: string }) =>
    api.post<ServiceOrder>('/service-orders', data),

  generatePdf: (id: number) => api.post<ServiceOrder>(`/service-orders/${id}/generate-pdf`),

  downloadPdf: async (id: number, orderNumber: string) => {
    const res = await api.get(`/service-orders/${id}/pdf`, { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${orderNumber}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
