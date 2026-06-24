export interface VehicleOwner {
  id: number;
  full_name: string;
  identification_number: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  bank_name: string | null;
  account_type: string | null;
  account_number: string | null;
  created_at: string;
  updated_at: string;
}

export interface VehicleOwnerFormData {
  full_name: string;
  identification_number: string;
  phone: string;
  whatsapp: string;
  email: string;
  bank_name: string;
  account_type: string;
  account_number: string;
}
