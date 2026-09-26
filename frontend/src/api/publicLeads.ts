import { api } from "./index";
import { pushDataLayerEvent } from "../utils/analytics";

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
  create: async (data: PublicLeadPayload) => {
    const res = await api.post<{ ok: boolean }>("/public/leads", data);
    // GA4 conversion event — covers all lead sources (contact form, price
    // reveal, chat widget) from this single call site. Trigger side (GTM
    // custom event "generate_lead" -> GA4 event tag) is manual GTM UI config.
    pushDataLayerEvent("generate_lead", { lead_source: data.found_via || "unknown" });
    return res;
  },
};
