import { api } from './index';
import type { FollowUpPanelEntry } from '../types/followUpMessage';

export const followUpMessagesApi = {
  panel: () => api.get<FollowUpPanelEntry[]>('/follow-up-messages/panel'),

  markSent: (reservationId: number, templateKey: string) =>
    api.post<FollowUpPanelEntry>(`/follow-up-messages/${reservationId}/mark-sent`, { template_key: templateKey }),

  unmarkSent: (reservationId: number, templateKey: string) =>
    api.post<FollowUpPanelEntry>(`/follow-up-messages/${reservationId}/unmark-sent`, { template_key: templateKey }),
};
