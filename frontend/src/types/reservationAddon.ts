export interface ReservationAddon {
  id: number;
  reservation_id: number;
  addon_package_id: number | null;
  name: string;
  description: string | null;
  provider_name: string | null;
  price: number;
  // % that Camino a mi Boda keeps from this service — independent of the
  // vehicle's 70/30 split. Usually 0 for a third-party service (e.g. the
  // florist) where the point is giving them work, not earning margin.
  company_percentage: number;
  // Does Camino a mi Boda collect the client's payment for this service, or
  // does the client pay the provider directly?
  company_collects_payment: boolean;
  display_order: number;
  created_at: string;
  company_amount: number;
  provider_amount: number;
}

export interface ReservationAddonForm {
  addon_package_id?: number | null;
  name: string;
  description?: string;
  provider_name?: string;
  price: number;
  company_percentage: number;
  company_collects_payment: boolean;
}
