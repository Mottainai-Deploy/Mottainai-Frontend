import type { OperationDateRange } from './stock-disposal.types';
import type { CreateReplenishmentExecutionPayload } from './replenishment-api.types';

export interface ReplenishmentDraftItem {
  id: string;
  productId: number;
  batchId: string;
  replenishedQuantity: string;
}

export interface ReplenishmentExecutionDraft {
  preListId: number;
  rating: string;
  comment: string;
  items: ReplenishmentDraftItem[];
}

export type PendingReplenishmentWrite =
  | { kind: 'generate'; key: string }
  | { kind: 'execute'; payload: CreateReplenishmentExecutionPayload; key: string };

export interface ReplenishmentOperationsState {
  range: OperationDateRange;
  appliedRange: OperationDateRange;
  revision: number;
  selectedPreListId: number | null;
  selectedExecutionId: number | null;
  draft: ReplenishmentExecutionDraft | null;
  pending: PendingReplenishmentWrite | null;
  reviewing: boolean;
  busy: boolean;
  uncertain: boolean;
  feedback: string;
  feedbackIsError: boolean;
}
