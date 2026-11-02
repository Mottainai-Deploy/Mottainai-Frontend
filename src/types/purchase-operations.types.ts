import type { OperationDateRange } from './stock-disposal.types';
import type { CreatePurchaseOrderPayload, UpdatePurchaseOrderPayload } from './purchase-order-api.types';
import type { CreateReceivingPayload } from './receiving-api.types';

export interface PurchaseOrderDraftItem {
  id: string;
  productId: string;
  requestedQuantity: string;
  unitCost: string;
}

export interface PurchaseOrderDraft {
  supplierId: string;
  expectedDeliveryDate: string;
  observation: string;
  items: PurchaseOrderDraftItem[];
}

export interface ReceivingDraftItem {
  id: string;
  purchaseOrderItemId: string;
  receivedQuantity: string;
  unitCost: string;
  manufactureDate: string;
  expirationDate: string;
  observation: string;
}

export interface ReceivingDraft {
  observation: string;
  items: ReceivingDraftItem[];
}

export type PendingPurchaseWrite =
  | { kind: 'create'; payload: CreatePurchaseOrderPayload; key: string }
  | { kind: 'update'; id: number; payload: UpdatePurchaseOrderPayload };

export interface PendingReceivingWrite {
  payload: CreateReceivingPayload;
  key: string;
}

export interface PurchaseOperationsState {
  range: OperationDateRange;
  appliedRange: OperationDateRange;
  revision: number;
  search: string;
  selectedOrderId: number | null;
  selectedReceivingId: number | null;
  orderDraft: PurchaseOrderDraft;
  editingOrderId: number | null;
  receivingDraft: ReceivingDraft;
  receivingFormOpen: boolean;
  pendingOrderWrite: PendingPurchaseWrite | null;
  pendingReceivingWrite: PendingReceivingWrite | null;
  reviewing: 'order' | 'receiving' | null;
  busy: boolean;
  uncertain: boolean;
  feedback: string;
  feedbackIsError: boolean;
}
