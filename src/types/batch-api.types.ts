export interface BatchResponse {
  id: number;
  productId: number;
  batchCode: string;
  manufactureDate: string | null;
  expirationDate: string | null;
  initialQuantity: number;
  unitCost: number;
  active: boolean;
  version: number;
}
