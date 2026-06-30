import { api } from './index';

export interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt?: string | null;
  content_md?: string | null;
  cover_image_url?: string | null;
  published: boolean;
  published_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BlogPostForm {
  title: string;
  slug: string;
  excerpt: string;
  content_md: string;
  cover_image_url: string;
  published: boolean;
}

export const blogApi = {
  list: (publishedOnly = false) =>
    api.get<BlogPost[]>('/blog', { params: { published_only: publishedOnly } }),

  getBySlug: (slug: string) =>
    api.get<BlogPost>(`/blog/${slug}`),

  create: (data: Omit<BlogPostForm, never>) =>
    api.post<BlogPost>('/blog', data),

  update: (id: number, data: Partial<BlogPostForm>) =>
    api.put<BlogPost>(`/blog/${id}`, data),

  togglePublish: (id: number) =>
    api.patch<BlogPost>(`/blog/${id}/publish`),

  delete: (id: number) =>
    api.delete(`/blog/${id}`),
};
