export type InventoryType = 'NORMAL' | 'CONSIGNED' | 'QUARANTINE';
export interface InventoryResponse {
  id: number;
  storeId: number;
  batchId: number;
  inventoryType: InventoryType;
  currentQuantity: number;
  minimumQuantity: number;
  maximumQuantity: number | null;
  location: string | null;
  version: number;
  reactivated: boolean;
}
export interface InventoryRow extends InventoryResponse {
  productId: number | null;
  productName: string;
  barcode: string;
  unitMeasure: string;
  batchCode: string;
  expirationDate: string | null;
}
