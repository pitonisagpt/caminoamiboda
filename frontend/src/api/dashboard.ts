import { api } from './index';

export interface UpcomingReservation {
  id: number;
  reservation_number: string;
  title: string;
  date: string;
  status: string;
  vehicle: string;
  driver: string;
  total_amount: number;
  remaining_balance: number;
}

export interface DashboardSummary {
  upcoming: UpcomingReservation[];
  reservations_by_status: Record<string, number>;
  vehicles_by_status: Record<string, number>;
  finance: {
    revenue_this_month: number;
    pending_collections: number;
    pending_owner_payments: number;
  };
}

export const dashboardApi = {
  summary: () => api.get<DashboardSummary>('/dashboard/summary'),
};
