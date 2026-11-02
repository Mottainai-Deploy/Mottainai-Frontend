import type { OperationDateRange } from './stock-disposal.types';
import type { CreateDonationPayload } from './donation-api.types';

export interface DonationDraftItem {
  id: string;
  batchId: string;
  donatedQuantity: string;
}

export interface DonationDraft {
  institution: string;
  observation: string;
  items: DonationDraftItem[];
}

export interface PendingDonationWrite {
  payload: CreateDonationPayload;
  key: string;
}

export interface DonationOperationsState {
  range: OperationDateRange;
  appliedRange: OperationDateRange;
  revision: number;
  selectedId: number | null;
  creating: boolean;
  draft: DonationDraft;
  pending: PendingDonationWrite | null;
  reviewing: boolean;
  busy: boolean;
  uncertain: boolean;
  feedback: string;
  feedbackIsError: boolean;
}
