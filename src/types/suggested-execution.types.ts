import type { ApiProfile } from './api.types';
import type { AlertPriority, ApiSuggestedAction, SuggestedActionType } from './alert-api.types';
import type { CatalogProduct } from './catalog-product.types';
import type { InventoryRow } from './inventory-api.types';
import type { StoreSummary } from './store-api.types';
import type { SupplierRecord } from './supplier.types';

export interface ExecutionItemPayload {
  productId?: number;
  batchId?: number;
  requestedQuantity?: number;
  quantity?: number;
  unitCost?: number;
  originalPrice?: number;
  promotionalPrice?: number;
  quantityAvailable?: number;
  priority?: AlertPriority;
}
export interface ExecutionPayload {
  supplierId?: number;
  expectedDeliveryDate?: string;
  destinationStoreId?: number;
  institution?: string;
  reason?: string;
  name?: string;
  description?: string;
  promotionType?: string;
  startsAt?: string;
  endsAt?: string;
  observation?: string;
  items: ExecutionItemPayload[];
}
export interface ExecutionResult {
  suggestedAction: ApiSuggestedAction;
  entityType: string;
  entityId: number;
}
export interface ExecutionDraftItem {
  id: string;
  referenceId: string;
  quantity: string;
  unitCost: string;
  originalPrice: string;
  promotionalPrice: string;
  quantityAvailable: string;
  priority: AlertPriority | '';
}
export interface ExecutionDraft {
  supplierId: string;
  expectedDeliveryDate: string;
  destinationStoreId: string;
  institution: string;
  reason: string;
  name: string;
  description: string;
  promotionType: string;
  startsAt: string;
  endsAt: string;
  observation: string;
  items: ExecutionDraftItem[];
}
export interface ExecutionContext {
  profile: ApiProfile;
  products: CatalogProduct[];
  inventory: InventoryRow[];
  suppliers: SupplierRecord[];
  stores: StoreSummary[];
  storeListAvailable: boolean;
}
export interface SuggestedExecutionProps {
  action: ApiSuggestedAction;
  storeId: number;
  onClose: () => void;
  onCompleted: () => void;
}
export interface ExecutionState {
  reload: number;
  draft: ExecutionDraft;
  context: ExecutionContext | null;
  loading: boolean;
  busy: boolean;
  error: string;
  uncertain: boolean;
  pending: { payload: ExecutionPayload; key: string } | null;
  result: ExecutionResult | null;
}
export interface ExecutionItemsProps {
  type: SuggestedActionType;
  draft: ExecutionDraft;
  context: ExecutionContext;
  onChange: (id: string, field: keyof Omit<ExecutionDraftItem, 'id'>, value: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
}
