import { api } from './index';

export const integrationsApi = {
  googleCalendarStatus: () => api.get<{ connected: boolean }>('/integrations/google-calendar/status'),
};
