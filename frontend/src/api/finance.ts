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
};
