import { api } from "./index";

export interface PublicLeadPayload {
  main_contact_name: string;
  // Either a phone number or a WhatsApp username — classified server-side
  // (see is_whatsapp_username() in the backend).
  contact: string;
  email?: string;
  wedding_date?: string;
  bride_name?: string;
  groom_name?: string;
  found_via?: string;
  message?: string;
  consent_accepted: boolean;
  elapsed_ms: number;
  hp_website?: string;
}

export const publicLeadsApi = {
  create: (data: PublicLeadPayload) => api.post<{ ok: boolean }>("/public/leads", data),
};
