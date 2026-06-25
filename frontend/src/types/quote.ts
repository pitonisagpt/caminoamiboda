export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
export type LocationZone = 'medellin' | 'rionegro' | 'other';

export const QUOTE_STATUS_LABEL: Record<QuoteStatus, string> = {
  draft: 'Borrador',
  sent: 'Enviada',
  accepted: 'Aceptada',
  rejected: 'Rechazada',
  expired: 'Vencida',
};

export const QUOTE_STATUS_COLOR: Record<QuoteStatus, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-100 text-blue-700',
  accepted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  expired: 'bg-yellow-100 text-yellow-700',
};

export const ZONE_LABEL: Record<LocationZone, string> = {
  medellin: 'Medellín y alrededores',
  rionegro: 'Llanogrande y alrededores',
  other: 'Otra zona',
};

export interface QuoteListItem {
  id: number;
  quote_number: string;
  display_customer: string;
  display_vehicle: string;
  event_date: string;
  total_price: number;
  deposit_amount: number | null;
  status: QuoteStatus;
  pdf_path: string | null;
  created_at: string;
}

export interface Quote extends QuoteListItem {
  customer_id: number | null;
  customer_name: string | null;
  customer_phone: string | null;
  vehicle_id: number | null;
  vehicle_description: string | null;
  service_duration: string | null;
  location_zone: LocationZone;
  pickup_location: string | null;
  ceremony_location: string | null;
  reception_location: string | null;
  payment_instructions: string | null;
  notes: string | null;
  share_token: string;
  updated_at: string;
}

export interface QuoteFormData {
  use_existing_customer: boolean;
  customer_id: number | null;
  customer_name: string;
  customer_phone: string;
  use_existing_vehicle: boolean;
  vehicle_id: number | null;
  vehicle_description: string;
  event_date: string;
  service_duration: string;
  location_zone: LocationZone;
  pickup_location: string;
  ceremony_location: string;
  reception_location: string;
  total_price: string;
  deposit_amount: string;
  payment_instructions: string;
  notes: string;
}
