export type EventType =
  | 'wedding'
  | 'brand_activation'
  | 'audiovisual_production'
  | 'quinceanera'
  | 'other';

export type LocationType =
  | 'pickup'
  | 'ceremony'
  | 'reception'
  | 'photoshoot'
  | 'other';

export interface EventLocation {
  id: number;
  timeline_id: number;
  location_name: string;
  location_type: LocationType;
  address: string | null;
  google_maps_link: string | null;
  contact_person: string | null;
  contact_phone: string | null;
  notes: string | null;
  display_order: number;
}

export interface TimelineActivity {
  id: number;
  timeline_id: number;
  location_id: number | null;
  time: string;
  description: string;
  estimated_duration: string | null;
  notes: string | null;
  display_order: number;
}

export interface EventTimeline {
  id: number;
  event_name: string;
  event_type: EventType;
  event_date: string;
  main_contact_name: string | null;
  main_contact_phone: string | null;
  assigned_vehicle: string | null;
  assigned_driver: string | null;
  assigned_driver_phone: string | null;
  special_instructions: string | null;
  notes: string | null;
  gcal_event_id: string | null;
  share_token_driver: string;
  share_token_customer: string;
  share_token_ops: string;
  locations: EventLocation[];
  activities: TimelineActivity[];
  created_at: string;
  updated_at: string;
}

export interface TimelineListItem {
  id: number;
  event_name: string;
  event_type: EventType;
  event_date: string;
  main_contact_name: string | null;
  assigned_vehicle: string | null;
  assigned_driver: string | null;
  assigned_driver_phone: string | null;
  share_token_driver: string;
  created_at: string;
}

export interface TimelinePublic {
  id: number;
  event_name: string;
  event_type: EventType;
  event_date: string;
  main_contact_name: string | null;
  main_contact_phone: string | null;
  assigned_vehicle: string | null;
  assigned_driver: string | null;
  assigned_driver_phone: string | null;
  special_instructions: string | null;
  notes: string | null;
  locations: EventLocation[];
  activities: TimelineActivity[];
}

export interface TimelineFormData {
  event_name: string;
  event_type: EventType;
  event_date: string;
  main_contact_name: string;
  main_contact_phone: string;
  assigned_vehicle: string;
  assigned_driver: string;
  assigned_driver_phone: string;
  special_instructions: string;
  notes: string;
}

export interface LocationFormData {
  location_name: string;
  location_type: LocationType;
  address: string;
  google_maps_link: string;
  contact_person: string;
  contact_phone: string;
  notes: string;
}

export interface ActivityFormData {
  time: string;
  description: string;
  location_id: number | null;
  estimated_duration: string;
  notes: string;
}
