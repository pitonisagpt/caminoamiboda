export interface ServiceOrder {
  id: number;
  order_number: string;
  reservation_id: number;
  vehicle_id: number | null;
  owner_id: number | null;
  owner_percentage: number;
  status: string;
  notes: string | null;
  pdf_path: string | null;
  created_at: string;
  updated_at: string;
  display_reservation: string | null;
  display_vehicle: string | null;
  display_owner: string | null;
}
