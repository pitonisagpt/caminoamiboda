export type AttachmentCategory = 'contract' | 'receipt' | 'photo' | 'media_consent' | 'other';

export interface ReservationAttachment {
  id: number;
  reservation_id: number;
  file_name: string;
  original_name: string;
  content_type: string;
  size_bytes: number;
  category: AttachmentCategory;
  url: string;
  uploaded_at: string;
}
