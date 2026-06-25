import { api } from './index';

export interface CalendarEvent {
  id: string;
  type: 'reservation' | 'timeline';
  source_id: number;
  title: string;
  subtitle: string | null;
  date: string;
  status: string;
  color: string;
  vehicle_id: number | null;
  driver_id: number | null;
  has_timeline?: boolean;
  timeline_id?: number | null;
}

export interface ConflictResult {
  conflicts: { type: string; message: string }[];
  has_conflicts: boolean;
}

export const calendarApi = {
  events: (start: string, end: string) =>
    api.get<CalendarEvent[]>('/calendar/events', { params: { start, end } }),

  conflicts: (params: {
    event_date: string;
    vehicle_id?: number | null;
    driver_id?: number | null;
    exclude_reservation_id?: number | null;
  }) => api.get<ConflictResult>('/calendar/conflicts', { params }),
};
