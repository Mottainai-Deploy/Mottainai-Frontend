export type ReceivingStatus = 'PENDING' | 'CONFIRMED' | 'DIVERGENT';
export interface ReceivingItemPayload {
  purchaseOrderItemId: number;
  receivedQuantity: number;
  unitCost: number;
  manufactureDate?: string | null;
  expirationDate: string;
  observation?: string | null;
}
export interface CreateReceivingPayload {
  purchaseOrderId: number;
  observation?: string | null;
  items: ReceivingItemPayload[];
}
export interface ReceivingItemResponse extends ReceivingItemPayload {
  id: number;
  productId: number;
  requestedQuantity: number;
}
export interface ReceivingResponse {
  id: number;
  purchaseOrderId: number;
  storeId: number;
  employeeId: number;
  receivingDate: string;
  status: ReceivingStatus;
  observation: string | null;
  items: ReceivingItemResponse[];
}
