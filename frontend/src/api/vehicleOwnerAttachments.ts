import { api } from './index';
import type { OwnerAttachmentCategory, VehicleOwnerAttachment } from '../types/vehicleOwnerAttachment';

export const vehicleOwnerAttachmentsApi = {
  list: (ownerId: number) =>
    api.get<VehicleOwnerAttachment[]>(`/vehicle-owners/${ownerId}/attachments`),

  upload: (ownerId: number, files: File[], category: OwnerAttachmentCategory) => {
    const form = new FormData();
    files.forEach(f => form.append('files', f));
    form.append('category', category);
    return api.post<VehicleOwnerAttachment[]>(`/vehicle-owners/${ownerId}/attachments`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  delete: (ownerId: number, attachmentId: number) =>
    api.delete(`/vehicle-owners/${ownerId}/attachments/${attachmentId}`),

  updateCategory: (ownerId: number, attachmentId: number, category: OwnerAttachmentCategory) =>
    api.patch<VehicleOwnerAttachment>(`/vehicle-owners/${ownerId}/attachments/${attachmentId}`, { category }),
};
