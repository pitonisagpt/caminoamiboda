export type ContractStatus = "draft" | "sent";
export type ClientType = "individual" | "company";
export type ClientIdType = "CC" | "NIT";

export interface ReservationContract {
  id: number;
  reservation_id: number;
  contract_number: string;
  status: ContractStatus;
  client_type: ClientType;
  client_name: string;
  client_legal_rep_name: string | null;
  client_legal_rep_id_number: string | null;
  client_id_type: ClientIdType;
  client_id_number: string;
  authorized_use: string | null;
  special_conditions: string | null;
  pdf_path: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentScheduleItem {
  id: number;
  reservation_id: number;
  description: string;
  percentage: number | null;
  fixed_amount: number | null;
  display_order: number;
  created_at: string;
}
