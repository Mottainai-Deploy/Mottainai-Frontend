export interface InventoryMovementResponse {
  id: number;
  inventoryId: number;
  employeeId: number;
  movementDate: string;
  movementType: 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER' | 'DONATION' | 'DISPOSAL';
  movedQuantity: number;
  previousBalance: number;
  currentBalance: number;
  observation: string | null;
  storeId: number;
}
export interface ConsumptionPayload {
  movementType: 'OUT';
  movedQuantity: number;
  observation: string;
}
