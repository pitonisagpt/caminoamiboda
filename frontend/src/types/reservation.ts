export type ReservationStatus =
  | 'lead'
  | 'quoted'
  | 'deposit_received'
  | 'reserved'
  | 'confirmed'
  | 'completed'
  | 'cancelled';

export const RESERVATION_STATUS_LABEL: Record<ReservationStatus, string> = {
  lead: 'Lead',
  quoted: 'Cotizado',
  deposit_received: 'Depósito recibido',
  reserved: 'Reservado',
  confirmed: 'Confirmado',
  completed: 'Completado',
  cancelled: 'Cancelado',
};

export const RESERVATION_STATUS_COLOR: Record<ReservationStatus, string> = {
  lead: 'bg-gray-100 text-gray-600',
  quoted: 'bg-blue-100 text-blue-700',
  deposit_received: 'bg-yellow-100 text-yellow-700',
  reserved: 'bg-purple-100 text-purple-700',
  confirmed: 'bg-pink-100 text-pink-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

export const STATUS_FLOW: ReservationStatus[] = [
  'lead', 'quoted', 'deposit_received', 'reserved', 'confirmed', 'completed', 'cancelled',
];

export interface ReservationListItem {
  id: number;
  reservation_number: string;
  display_customer: string;
  display_vehicle: string;
  display_driver: string;
  event_date: string;
  total_amount: number;
  deposit_paid: number;
  remaining_balance: number;
  status: ReservationStatus;
  timeline_id: number | null;
  created_at: string;
}

export interface Reservation extends ReservationListItem {
  customer_id: number | null;
  contact_id: number | null;
  quote_id: number | null;
  vehicle_id: number | null;
  driver_id: number | null;
  owner_driver_id: number | null;
  owner_driver_name: string | null;
  owner_driver_phone: string | null;
  start_time: string | null;
  end_time: string | null;
  display_contact: string | null;
  contact_phone: string | null;
  contact_type: string | null;
  special_instructions: string | null;
  notes: string | null;
  owner_name: string | null;
  owner_whatsapp: string | null;
  timeline_event_name: string | null;
  updated_at: string;
}

export interface ReservationPage {
  items: ReservationListItem[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface ReservationFormData {
  customer_id: string;
  contact_id: string;
  quote_id: string;
  vehicle_id: string;
  driver_combined: string;
  event_date: string;
  start_time: string;
  end_time: string;
  total_amount: string;
  deposit_paid: string;
  status: ReservationStatus;
  special_instructions: string;
  notes: string;
}
