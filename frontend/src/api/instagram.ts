import { api } from './index';

export interface InstagramPost {
  instagram_id: string;
  media_url: string;
  thumbnail_url?: string | null;
  permalink: string;
  caption?: string | null;
  media_type?: string | null;
  timestamp?: string | null;
}

export const instagramApi = {
  feed: () => api.get<InstagramPost[]>('/instagram/feed'),
  sync: () => api.post<{ synced: number; message: string }>('/instagram/sync'),
};
