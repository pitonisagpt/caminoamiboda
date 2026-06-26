import { api } from './index';

export interface OwnerSettlement {
  id: number;
  settlement_number: string;
  reservation_id: number;
  vehicle_id: number | null;
  owner_id: number | null;
  reservation_value: number;
  owner_percentage: number;
  owner_amount: number;
  company_amount: number;
  status: 'pending' | 'paid';
  notes: string | null;
  pdf_path: string | null;
  created_at: string;
  updated_at: string;
  display_reservation: string | null;
  display_vehicle: string | null;
  display_owner: string | null;
}

export const ownerSettlementsApi = {
  list: () => api.get<OwnerSettlement[]>('/owner-settlements'),

  get: (id: number) => api.get<OwnerSettlement>(`/owner-settlements/${id}`),

  create: (data: { reservation_id: number; vehicle_id?: number; owner_id?: number; owner_percentage?: number; notes?: string }) =>
    api.post<OwnerSettlement>('/owner-settlements', data),

  markPaid: (id: number) => api.patch<OwnerSettlement>(`/owner-settlements/${id}/mark-paid`),

  generatePdf: (id: number) => api.post<OwnerSettlement>(`/owner-settlements/${id}/generate-pdf`),

  downloadPdf: async (id: number, settlementNumber: string) => {
    const res = await api.get(`/owner-settlements/${id}/pdf`, { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${settlementNumber}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
