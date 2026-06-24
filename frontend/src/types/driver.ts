export type DriverStatus = "active" | "inactive";

export interface Driver {
  id: number;
  full_name: string;
  identification_number: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  driver_license_number: string | null;
  license_expiration_date: string | null;
  authorized_vehicles: string | null;
  notes: string | null;
  status: DriverStatus;
  created_at: string;
  updated_at: string;
}

export interface DriverFormData {
  full_name: string;
  identification_number: string;
  phone: string;
  whatsapp: string;
  email: string;
  driver_license_number: string;
  license_expiration_date: string;
  authorized_vehicles: string;
  notes: string;
  status: DriverStatus;
}
