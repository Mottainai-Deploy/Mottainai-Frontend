import type { ApiProfile } from './api.types';
import type { StoreSummary } from './store-api.types';
import type { OperationDateRange } from './stock-disposal.types';

export type ApiTransferStatus = 'REQUESTED' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELED';
export type TransferAction = 'send' | 'receive' | 'cancel';
export interface ApiTransfer {
  id: number;
  sourceStoreId: number;
  destinationStoreId: number;
  employeeId: number;
  status: ApiTransferStatus;
  observation: string | null;
  requestDate: string;
  completionDate: string | null;
  version: number;
  items: { batchId: number; transferredQuantity: number }[];
}
export interface TransferPayload {
  destinationStoreId: number;
  observation: string;
  items: { batchId: number; transferredQuantity: number }[];
}
export interface TransferDraftItem {
  id: string;
  inventoryId: string;
  quantity: string;
}
export interface ApiTransferForm {
  destinationStoreId: string;
  observation: string;
  items: TransferDraftItem[];
}
export interface TransferFormErrors {
  destinationStoreId?: string;
  observation?: string;
  items?: string;
}
export interface TransferContext {
  profile: ApiProfile;
  stores: StoreSummary[];
  storeListAvailable: boolean;
}
export interface TransferCreateState {
  form: ApiTransferForm;
  errors: TransferFormErrors;
  busy: boolean;
  reviewing: boolean;
  failed: boolean;
  message: string;
  pending: { payload: TransferPayload; key: string } | null;
  created: ApiTransfer | null;
  revision: number;
}
export interface TransferListState {
  range: OperationDateRange;
  appliedRange: OperationDateRange;
  error: string;
  search: string;
  revision: number;
}
export interface TransferDetailProps { id: string; onChanged: () => void }
export interface TransferDetailState {
  data: ApiTransfer | null;
  action: TransferAction | null;
  busy: boolean;
  uncertain: boolean;
  failed: boolean;
  message: string;
}
