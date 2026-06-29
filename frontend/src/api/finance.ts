import { api } from './index';

export interface FinanceSummary {
  revenue_this_year: number;
  revenue_last_year: number;
  yoy_change_pct: number | null;
  revenue_period: number;
  company_revenue_period: number;
  deposits_received_period: number;
  outstanding_balance_total: number;
  pending_owner_payments: number;
}

export interface OwnerRevenueStat {
  owner_name: string;
  completed_count: number;
  total_revenue: number;
  owner_amount: number;
  company_amount: number;
}

export interface DepositPoint {
  month: string;
  deposits_received: number;
  remaining_balance: number;
}

export interface AgingItem {
  id: number;
  reservation_number: string;
  display_customer: string;
  event_date: string;
  days_to_event: number;
  total_amount: number;
  deposit_paid: number;
  remaining_balance: number;
  status: string;
}

export interface VehicleRevenueStat {
  vehicle_id: number;
  name: string;
  owner: string;
  is_company_owned: boolean;
  completed_events: number;
  total_revenue: number;
  company_share: number;
  avg_ticket: number;
  idle_months: number;
}

export interface DateRangeParams {
  date_from?: string | null;
  date_to?: string | null;
}

export const financeApi = {
  summary: (params?: DateRangeParams) =>
    api.get<FinanceSummary>('/finance/summary', { params: params ?? {} }),

  ownerRevenue: (params?: DateRangeParams) =>
    api.get<{ owners: OwnerRevenueStat[] }>('/finance/charts/owner-revenue', { params: params ?? {} }),

  deposits: (params?: DateRangeParams) =>
    api.get<{ data: DepositPoint[] }>('/finance/charts/deposits', { params: params ?? {} }),

  aging: () =>
    api.get<{ items: AgingItem[] }>('/finance/aging'),

  vehicleRevenue: (params?: DateRangeParams) =>
    api.get<{ vehicles: VehicleRevenueStat[]; total_months: number }>('/finance/charts/vehicle-revenue', { params: params ?? {} }),

  export: (params?: DateRangeParams) =>
    api.get('/finance/export', { params: params ?? {}, responseType: 'blob' }),
};
