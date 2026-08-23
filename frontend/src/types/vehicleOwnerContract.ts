export type ContractStatus = 'draft' | 'sent';

export interface VehicleOwnerContract {
  id: number;
  owner_id: number;
  contract_number: string;
  status: ContractStatus;
  pdf_path: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
