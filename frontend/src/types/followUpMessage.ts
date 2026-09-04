export type WindowStatus = 'a_tiempo' | 'temprano' | 'atrasado';

export interface FollowUpTemplateEntry {
  key: string;
  label: string;
  window_label: string;
  window_status: WindowStatus;
  sent_at: string | null;
  text: string;
}

export interface FollowUpPanelEntry {
  reservation_id: number;
  reservation_number: string;
  display_customer: string;
  display_vehicle: string;
  event_date: string;
  days_to_event: number;
  phone: string | null;
  whatsapp_username: string | null;
  current_key: string | null;
  last_sent_at: string | null;
  templates: FollowUpTemplateEntry[];
}
