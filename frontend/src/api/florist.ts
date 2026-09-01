import { api } from './index';

export interface FloristPhoto {
  id: number;
  file_name: string;
  original_name: string;
  label: string;
  display_order: number;
  is_visible: boolean;
  url: string;
  created_at: string;
}

export interface FloristPublic {
  vendor_name: string;
  description: string;
  description_en?: string | null;
  instagram_url: string;
  whatsapp_url: string;
  photos: FloristPhoto[];
}

export interface FloristAdmin {
  vendor_name: string;
  description: string;
  description_en?: string | null;
  whatsapp_number: string;
  whatsapp_message: string;
  instagram_url: string;
  photos: FloristPhoto[];
}

export interface FloristSettingsForm {
  vendor_name: string;
  description: string;
  description_en?: string | null;
  whatsapp_number: string;
  whatsapp_message: string;
  instagram_url: string;
}

export const floristApi = {
  getPublic: () => api.get<FloristPublic>('/florist'),
  getAdmin: () => api.get<FloristAdmin>('/florist/admin'),
  update: (data: FloristSettingsForm) => api.put<FloristAdmin>('/florist', data),

  uploadPhotos(files: File[]) {
    const form = new FormData();
    files.forEach((f) => form.append('files', f));
    return api.post<FloristPhoto[]>('/florist/photos', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  updatePhotos(photos: { id: number; display_order: number; is_visible: boolean; label: string }[]) {
    return api.put<FloristPhoto[]>('/florist/photos', { photos });
  },

  deletePhoto(photoId: number) {
    return api.delete(`/florist/photos/${photoId}`);
  },
};
