export interface Customer {
  id: number;
  bride_name: string | null;
  groom_name: string | null;
  main_contact_name: string;
  identification_number: string | null;
  phone: string | null;
  whatsapp: string | null;
  whatsapp_username: string | null;
  email: string | null;
  bride_email: string | null;
  groom_email: string | null;
  wedding_date: string | null;
  instagram: string | null;
  referral_source: string | null;
  notes: string | null;
  lead_status: string | null;
  lead_temperature: string | null;
  aplica_hora_regalo: boolean | null;
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
  whatsapp_username: string;
  email: string;
  bride_email: string;
  groom_email: string;
  wedding_date: string;
  instagram: string;
  referral_source: string;
  notes: string;
}
