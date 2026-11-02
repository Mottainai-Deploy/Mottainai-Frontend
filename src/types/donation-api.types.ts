export type DonationStatus = 'REGISTERED' | 'COMPLETED' | 'CANCELED';
export interface DonationItemPayload {
  batchId: number;
  donatedQuantity: number;
}
export interface CreateDonationPayload {
  institution: string;
  suggestedActionId?: number | null;
  observation?: string | null;
  items: DonationItemPayload[];
}
export interface DonationItemResponse extends DonationItemPayload { id: number; }
export interface DonationResponse {
  id: number;
  storeId: number;
  employeeId: number;
  institution: string;
  donationDate: string;
  status: DonationStatus;
  observation: string | null;
  version: number;
  items: DonationItemResponse[];
}
