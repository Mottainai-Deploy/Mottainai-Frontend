export type PreListStatus = 'GENERATED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED';
export type ReplenishmentPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export interface ReplenishmentPreListItem {
  id: number;
  productId: number;
  suggestedQuantity: number;
  priority: ReplenishmentPriority;
}
export interface ReplenishmentPreListResponse {
  id: number;
  storeId: number;
  employeeId: number | null;
  generatedAt: string;
  status: PreListStatus;
  items: ReplenishmentPreListItem[];
}
export interface ReplenishmentItemPayload {
  batchId: number;
  replenishedQuantity: number;
}
export interface CreateReplenishmentExecutionPayload {
  preListId: number;
  rating?: number | null;
  comment?: string | null;
  items: ReplenishmentItemPayload[];
}
export interface ReplenishmentExecutionItem extends ReplenishmentItemPayload { id: number; }
export interface ReplenishmentExecutionResponse {
  id: number;
  preListId: number;
  employeeId: number;
  startDate: string;
  endDate: string | null;
  rating: number | null;
  comment: string | null;
  items: ReplenishmentExecutionItem[];
}
