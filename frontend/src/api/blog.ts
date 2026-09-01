import { api } from './index';

export interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt?: string | null;
  content_md?: string | null;
  title_en?: string | null;
  slug_en?: string | null;
  excerpt_en?: string | null;
  content_md_en?: string | null;
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
  title_en: string;
  slug_en: string;
  excerpt_en: string;
  content_md_en: string;
  cover_image_url: string;
  published: boolean;
}

export const blogApi = {
  // Public — published posts only. lang="en" additionally excludes posts
  // with no English translation yet (see backend routers/blog.py).
  list: (lang?: 'en') => api.get<BlogPost[]>('/blog', { params: lang ? { lang } : {} }),

  // Admin — every post, drafts included.
  listAll: () => api.get<BlogPost[]>('/blog/all'),

  // lang="en" looks up by slug_en first, falling back to the Spanish slug
  // (frontend then renders a "only available in Spanish" banner instead of
  // treating that fallback hit as a 404).
  getBySlug: (slug: string, lang?: 'en') =>
    api.get<BlogPost>(`/blog/${slug}`, { params: lang ? { lang } : {} }),

  create: (data: Omit<BlogPostForm, never>) =>
    api.post<BlogPost>('/blog', data),

  update: (id: number, data: Partial<BlogPostForm>) =>
    api.put<BlogPost>(`/blog/${id}`, data),

  togglePublish: (id: number) =>
    api.patch<BlogPost>(`/blog/${id}/publish`),

  delete: (id: number) =>
    api.delete(`/blog/${id}`),
};
