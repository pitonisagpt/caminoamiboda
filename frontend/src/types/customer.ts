export interface Customer {
  id: number;
  bride_name: string | null;
  groom_name: string | null;
  main_contact_name: string;
  identification_number: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  wedding_date: string | null;
  instagram: string | null;
  referral_source: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerFormData {
  bride_name: string;
  groom_name: string;
  main_contact_name: string;
  identification_number: string;
  phone: string;
  whatsapp: string;
  email: string;
  wedding_date: string;
  instagram: string;
  referral_source: string;
  notes: string;
}
