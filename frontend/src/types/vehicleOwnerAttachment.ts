export type OwnerAttachmentCategory = 'contract' | 'cedula' | 'rut' | 'other';

export interface VehicleOwnerAttachment {
  id: number;
  owner_id: number;
  file_name: string;
  original_name: string;
  content_type: string;
  size_bytes: number;
  category: OwnerAttachmentCategory;
  url: string;
  uploaded_at: string;
}
