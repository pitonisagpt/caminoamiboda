import { api } from './index';

export interface AddonPackage {
  id: number;
  name: string;
  type: 'bouquet' | 'extra_hour';
  description?: string;
  price: number;
  is_active: boolean;
  display_order: number;
}

export const addonPackagesApi = {
  list: () => api.get<AddonPackage[]>('/addon-packages'),
  listPublic: () => api.get<AddonPackage[]>('/addon-packages/public'),
  create: (data: Partial<AddonPackage>) => api.post<AddonPackage>('/addon-packages', data),
  update: (id: number, data: Partial<AddonPackage>) => api.put<AddonPackage>(`/addon-packages/${id}`, data),
  delete: (id: number) => api.delete(`/addon-packages/${id}`),
};
