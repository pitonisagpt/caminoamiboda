import { api } from './index';
import type { VehicleOwnerContract } from '../types/vehicleOwnerContract';

export const vehicleOwnerContractsApi = {
  get: (ownerId: number) => api.get<VehicleOwnerContract>(`/vehicle-owners/${ownerId}/contract`),

  generatePdf: (ownerId: number) =>
    api.post<VehicleOwnerContract>(`/vehicle-owners/${ownerId}/contract/generate-pdf`),

  downloadPdf: async (ownerId: number, contractNumber: string) => {
    const res = await api.get(`/vehicle-owners/${ownerId}/contract/pdf`, { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${contractNumber}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
