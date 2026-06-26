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
  period_events: UpcomingReservation[];
  reservations_by_status: Record<string, number>;
  vehicles_by_status: Record<string, number>;
  finance: {
    revenue_this_month: number;
    pending_collections: number;
    pending_owner_payments: number;
    pending_company_revenue: number;
  };
}

export interface RevenueTrendPoint {
  month: string;       // "2024-01"
  revenue: number;
  company_share: number;
  count: number;
}

export interface RevenueTrendResponse {
  data: RevenueTrendPoint[];
}

export interface FunnelStage {
  status: string;
  label: string;
  count: number;
  conversion: number | null;
}

export interface MonthlyBookingPoint {
  month: string;
  created: number;
  completed: number;
}

export interface CategoryPoint {
  category: string;
  label: string;
  count: number;
  revenue: number;
}

export interface SeasonalityPoint {
  month: number;
  label: string;
  count: number;
}

export interface AnalyticsResponse {
  funnel: FunnelStage[];
  monthly_bookings: MonthlyBookingPoint[];
  category_breakdown: CategoryPoint[];
  seasonality: SeasonalityPoint[];
}

export interface DateRangeParams {
  date_from?: string | null;
  date_to?: string | null;
}

export const dashboardApi = {
  summary: (params?: DateRangeParams) =>
    api.get<DashboardSummary>('/dashboard/summary', { params: params ?? {} }),
  revenueTrend: (params?: DateRangeParams & { months?: number }) =>
    api.get<RevenueTrendResponse>('/dashboard/charts/revenue-trend', { params: params ?? { months: 24 } }),
  analytics: (params?: DateRangeParams) =>
    api.get<AnalyticsResponse>('/dashboard/charts/analytics', { params: params ?? {} }),
};
