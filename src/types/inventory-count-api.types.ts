export type InventoryCountStatus = 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED';
export interface InventoryCountItem {
  id: number;
  inventoryId: number;
  systemQuantity: number;
  countedQuantity: number;
  difference: number;
  observation: string | null;
}
export interface InventoryCount {
  id: number;
  storeId: number;
  employeeId: number;
  status: InventoryCountStatus;
  startedAt: string;
  finishedAt: string | null;
  observation: string | null;
  items: InventoryCountItem[];
}
export interface CountItemForm {
  inventoryId: string;
  quantity: string;
  observation: string;
}
export interface CountItemPayload {
  inventoryId: number;
  countedQuantity: number;
  observation: string;
}
export interface CountEditorState {
  countId: string;
  count: InventoryCount | null;
  item: CountItemForm;
  observation: string;
  busy: boolean;
  message: string;
  failed: boolean;
  reviewing: boolean;
  uncertainFinish: boolean;
  removal: InventoryCountItem | null;
  uncertainRemoval: boolean;
  errors: Partial<Record<keyof CountItemForm, string>>;
}

export interface InventoryCountEditorProps {
  countId: string;
  onCreated: (id: number) => void;
}
