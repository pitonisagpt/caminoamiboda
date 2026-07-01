import { api } from './index';

export interface Review {
  id: number;
  author_name: string;
  rating: number;
  body: string;
  source: 'google' | 'manual';
  vehicle_id?: number | null;
  is_visible: boolean;
  event_date?: string | null;
  created_at: string;
}

export interface ReviewForm {
  author_name: string;
  rating: number;
  body: string;
  source: 'google' | 'manual';
  vehicle_id?: number | null;
  is_visible: boolean;
  event_date?: string | null;
}

export const reviewsApi = {
  listPublic: (vehicle_id?: number) =>
    api.get<Review[]>('/reviews', { params: vehicle_id ? { vehicle_id } : {} }),
  listAdmin: () => api.get<Review[]>('/reviews/admin'),
  create: (data: ReviewForm) => api.post<Review>('/reviews', data),
  update: (id: number, data: Partial<ReviewForm>) => api.put<Review>(`/reviews/${id}`, data),
  toggle: (id: number) => api.patch<Review>(`/reviews/${id}/toggle`),
  delete: (id: number) => api.delete(`/reviews/${id}`),
};
