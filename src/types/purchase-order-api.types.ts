export type PurchaseOrderStatus = 'PENDING' | 'APPROVED' | 'CANCELED';
export interface PurchaseOrderItemPayload {
  productId: number;
  requestedQuantity: number;
  unitCost: number;
}
export interface CreatePurchaseOrderPayload {
  supplierId: number;
  expectedDeliveryDate?: string | null;
  observation?: string | null;
  items: PurchaseOrderItemPayload[];
}
export interface UpdatePurchaseOrderPayload extends Omit<CreatePurchaseOrderPayload, 'supplierId'> {
  supplierId?: number | null;
  version: number;
}
export interface PurchaseOrderItemResponse extends PurchaseOrderItemPayload {
  id: number;
  subtotal: number;
}
export interface PurchaseOrderResponse {
  id: number;
  storeId: number;
  supplierId: number;
  employeeId: number;
  orderDate: string;
  expectedDeliveryDate: string | null;
  status: PurchaseOrderStatus;
  observation: string | null;
  totalAmount: number;
  version: number;
  items: PurchaseOrderItemResponse[];
}
