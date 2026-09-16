import type { ContractStatus } from './reservationContract';

export interface MediaConsent {
  id: number;
  reservation_id: number;
  consent_number: string;
  status: ContractStatus;
  bride_name: string;
  bride_id_number: string | null;
  groom_name: string;
  groom_id_number: string | null;
  pdf_path: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
