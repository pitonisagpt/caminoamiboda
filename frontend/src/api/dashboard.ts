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
  vehicle_photo_url: string | null;
  vehicle_is_company_owned: boolean;
}

export interface DashboardSummary {
  upcoming: UpcomingReservation[];
  period_events: UpcomingReservation[];
  reservations_by_status: Record<string, number>;
  vehicles_by_status: Record<string, number>;
  finance: {
    revenue_this_month: number;
    company_revenue_this_month: number;
    pending_collections: number;
    company_pending_collections: number;
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

export interface VehicleUsageStat {
  id: number;
  display_name: string;
  license_plate: string;
  photo_url: string | null;
  event_count: number;
  completed_count: number;
  total_revenue: number;
  company_share: number;
  avg_revenue: number;
  last_event_date: string | null;
  next_event_date: string | null;
}

export interface VehicleUsageResponse {
  vehicles: VehicleUsageStat[];
}

export const dashboardApi = {
  summary: (params?: DateRangeParams) =>
    api.get<DashboardSummary>('/dashboard/summary', { params: params ?? {} }),
  revenueTrend: (params?: DateRangeParams & { months?: number }) =>
    api.get<RevenueTrendResponse>('/dashboard/charts/revenue-trend', { params: params ?? { months: 24 } }),
  analytics: (params?: DateRangeParams) =>
    api.get<AnalyticsResponse>('/dashboard/charts/analytics', { params: params ?? {} }),
  vehicleUsage: (params?: DateRangeParams & { vehicle_ids?: number[] }) => {
    const { vehicle_ids, ...rest } = params ?? {};
    return api.get<VehicleUsageResponse>('/dashboard/charts/vehicles', {
      params: { ...rest, ...(vehicle_ids?.length ? { vehicle_ids: vehicle_ids.join(',') } : {}) },
    });
  },
};
