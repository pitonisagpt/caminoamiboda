import { api } from './index';
import type {
  EventTimeline,
  TimelineListItem,
  TimelinePublic,
  EventLocation,
  TimelineActivity,
  TimelineContact,
} from '../types/timeline';

export const timelinesApi = {
  list: () => api.get<TimelineListItem[]>('/timelines'),
  get: (id: number) => api.get<EventTimeline>(`/timelines/${id}`),
  create: (data: Record<string, unknown>) => api.post<EventTimeline>('/timelines', data),
  update: (id: number, data: Record<string, unknown>) => api.put<EventTimeline>(`/timelines/${id}`, data),
  delete: (id: number) => api.delete(`/timelines/${id}`),
  regenerateTokens: (id: number) => api.post<EventTimeline>(`/timelines/${id}/regenerate-tokens`),

  // Locations
  listLocations: (timelineId: number) => api.get<EventLocation[]>(`/timelines/${timelineId}/locations`),
  createLocation: (timelineId: number, data: Record<string, unknown>) =>
    api.post<EventLocation>(`/timelines/${timelineId}/locations`, data),
  updateLocation: (timelineId: number, locationId: number, data: Record<string, unknown>) =>
    api.put<EventLocation>(`/timelines/${timelineId}/locations/${locationId}`, data),
  deleteLocation: (timelineId: number, locationId: number) =>
    api.delete(`/timelines/${timelineId}/locations/${locationId}`),

  // Activities
  listActivities: (timelineId: number) => api.get<TimelineActivity[]>(`/timelines/${timelineId}/activities`),
  createActivity: (timelineId: number, data: Record<string, unknown>) =>
    api.post<TimelineActivity>(`/timelines/${timelineId}/activities`, data),
  updateActivity: (timelineId: number, activityId: number, data: Record<string, unknown>) =>
    api.put<TimelineActivity>(`/timelines/${timelineId}/activities/${activityId}`, data),
  deleteActivity: (timelineId: number, activityId: number) =>
    api.delete(`/timelines/${timelineId}/activities/${activityId}`),
  reorderActivities: (timelineId: number, items: { id: number; display_order: number }[]) =>
    api.put(`/timelines/${timelineId}/activities/reorder`, items),

  // Contacts
  listContacts: (timelineId: number) => api.get<TimelineContact[]>(`/timelines/${timelineId}/contacts`),
  createContact: (timelineId: number, data: Record<string, unknown>) =>
    api.post<TimelineContact>(`/timelines/${timelineId}/contacts`, data),
  updateContact: (timelineId: number, contactId: number, data: Record<string, unknown>) =>
    api.put<TimelineContact>(`/timelines/${timelineId}/contacts/${contactId}`, data),
  deleteContact: (timelineId: number, contactId: number) =>
    api.delete(`/timelines/${timelineId}/contacts/${contactId}`),

  // PDF
  fetchPdfBlob: async (id: number): Promise<string> => {
    const response = await api.get(`/timelines/${id}/pdf`, { responseType: 'blob' });
    return URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
  },

  downloadPdf: async (id: number, eventName: string) => {
    const url = await timelinesApi.fetchPdfBlob(id);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Minuto-a-Minuto-${eventName}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  },

  // Public (no auth)
  getPublic: (token: string) => api.get<TimelinePublic>(`/public/evento/${token}`),
};
