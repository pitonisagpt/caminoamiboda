import { api } from './index';

export interface CalendarEventVehicle {
  id: number;
  display_name: string;
  license_plate: string | null;
  photo_url: string | null;
  owner_name: string | null;
  owner_whatsapp: string | null;
  driver_id: number | null;
  owner_driver_id: number | null;
  display_driver: string | null;
  display_driver_phone: string | null;
}

export interface CalendarEvent {
  id: string;
  type: 'reservation' | 'timeline';
  source_id: number;
  title: string;
  subtitle: string | null;
  vehicle?: string | null;
  date: string;
  end_date?: string | null;
  status: string;
  color: string;
  vehicle_id: number | null;
  driver_id: number | null;
  has_timeline?: boolean;
  timeline_id?: number | null;
  vehicle_photo_url?: string | null;
  vehicle_license_plate?: string | null;
  owner_name?: string | null;
  owner_whatsapp?: string | null;
  driver_phone?: string | null;
  // Additive — one entry per vehicle on the reservation, each with its own
  // driver. The singular fields above stay synced to the primary (first) one.
  vehicles?: CalendarEventVehicle[];
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
    vehicle_ids?: number[];
    driver_ids?: number[];
    owner_driver_ids?: number[];
    exclude_reservation_id?: number | null;
  }) => api.get<ConflictResult>('/calendar/conflicts', {
    params: {
      event_date: params.event_date,
      // Comma-separated, not a native array param — matches how the backend
      // parses it (axios would otherwise serialize arrays as vehicle_ids[]=1&...,
      // which FastAPI doesn't read as repeated keys).
      vehicle_ids: params.vehicle_ids?.length ? params.vehicle_ids.join(',') : undefined,
      driver_ids: params.driver_ids?.length ? params.driver_ids.join(',') : undefined,
      owner_driver_ids: params.owner_driver_ids?.length ? params.owner_driver_ids.join(',') : undefined,
      exclude_reservation_id: params.exclude_reservation_id ?? undefined,
    },
  }),
};
