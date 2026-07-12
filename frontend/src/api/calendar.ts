import { api } from './index';

export interface CalendarEvent {
  id: string;
  type: 'reservation' | 'timeline';
  source_id: number;
  title: string;
  subtitle: string | null;
  vehicle?: string | null;
  date: string;
  status: string;
  color: string;
  vehicle_id: number | null;
  driver_id: number | null;
  has_timeline?: boolean;
  timeline_id?: number | null;
  start_time?: string | null;
  end_time?: string | null;
  vehicle_photo_url?: string | null;
  vehicle_license_plate?: string | null;
  owner_name?: string | null;
  owner_whatsapp?: string | null;
  driver_phone?: string | null;
}

export interface ConflictItem {
  type: 'vehicle' | 'driver' | 'pico_y_placa';
  severity: 'blocking' | 'warning';
  reservation_number: string;
  message: string;
}

export interface ConflictResult {
  conflicts: ConflictItem[];
  has_conflicts: boolean;
}

export const calendarApi = {
  events: (start: string, end: string) =>
    api.get<CalendarEvent[]>('/calendar/events', { params: { start, end } }),

  conflicts: (params: {
    event_date: string;
    vehicle_id?: number | null;
    driver_id?: number | null;
    start_time?: string | null;
    end_time?: string | null;
    exclude_reservation_id?: number | null;
  }) => api.get<ConflictResult>('/calendar/conflicts', { params }),
};
