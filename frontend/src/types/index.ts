export type DocumentType = "formal" | "letter";
export type DocumentStatus = "draft" | "sent" | "paid";
export type IdType = "CC" | "NIT";

export interface BillingDocument {
  id: number;
  document_number: string;
  document_type: DocumentType;
  status: DocumentStatus;
  created_at: string;
  updated_at: string;
  service_date: string;
  client_name: string;
  client_id_type: IdType;
  client_id_number: string;
  client_address: string | null;
  client_email: string | null;
  client_phone: string | null;
  concept: string;
  vehicle_description: string | null;
  time_start: string | null;
  time_end: string | null;
  route: string | null;
  special_conditions: string | null;
  total_amount: string;
  payment_instructions: string;
  include_cancellation_policy: boolean;
  include_breakdown_policy: boolean;
  pdf_path: string | null;
  notes: string | null;
}

export interface BillingDocumentListItem {
  id: number;
  document_number: string;
  document_type: DocumentType;
  status: DocumentStatus;
  client_name: string;
  service_date: string;
  total_amount: string;
  created_at: string;
  pdf_path: string | null;
}

export interface BillingDocumentFormData {
  document_type: DocumentType;
  service_date: string;
  client_name: string;
  client_id_type: IdType;
  client_id_number: string;
  client_address: string;
  client_email: string;
  client_phone: string;
  concept: string;
  vehicle_description: string;
  time_start: string;
  time_end: string;
  route: string;
  special_conditions: string;
  total_amount: string;
  payment_instructions: string;
  include_cancellation_policy: boolean;
  include_breakdown_policy: boolean;
  notes: string;
}
