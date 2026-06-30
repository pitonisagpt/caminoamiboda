import { api } from './index';
import type { CatalogLocation, CatalogLocationFormData, LocationType } from '../types/catalogLocation';

interface ListParams {
  q?: string;
  type?: LocationType;
}

export const catalogLocationsApi = {
  list: (params: ListParams = {}) =>
    api.get<CatalogLocation[]>('/catalog-locations', { params }),

  create: (data: CatalogLocationFormData) =>
    api.post<CatalogLocation>('/catalog-locations', data),

  update: (id: number, data: Partial<CatalogLocationFormData>) =>
    api.put<CatalogLocation>(`/catalog-locations/${id}`, data),

  delete: (id: number) =>
    api.delete(`/catalog-locations/${id}`),

  importFromEvents: () =>
    api.post<{ imported: number }>('/catalog-locations/import-from-events'),

  resolveCoords: () =>
    api.post<{ resolved: number; total: number }>('/catalog-locations/resolve-coords', null, { timeout: 120_000 }),
};
