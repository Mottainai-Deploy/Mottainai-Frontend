export interface OperationDateRange {
  from: string;
  to: string;
}
export type DisposalReason = 'Avaria' | 'Vencimento' | 'Consumo interno';
export interface DisposalForm {
  inventoryId: string;
  quantity: string;
  reason: DisposalReason;
  observation: string;
}
export interface DisposalPayload {
  reason: string;
  observation: string;
  items: { batchId: number; disposedQuantity: number }[];
}
export interface DisposalResponse {
  id: number;
  storeId: number;
  employeeId: number;
  reason: string;
  disposalDate: string;
  observation: string | null;
  version: number;
  items: { id: number; batchId: number; disposedQuantity: number }[];
}
export type DisposalAttempt =
  | { kind: 'disposal'; key: string; payload: DisposalPayload }
  | { kind: 'consumption'; key: string; inventoryId: number; payload: ConsumptionPayload };
export interface DisposalEditorState {
  form: DisposalForm;
  errors: Partial<Record<keyof DisposalForm, string>>;
  reviewing: boolean;
  busy: boolean;
  failed: boolean;
  message: string;
  pending: DisposalAttempt | null;
  created: { id: number; kind: 'disposal' | 'consumption' } | null;
  range: OperationDateRange;
  appliedRange: OperationDateRange;
  rangeError: string;
  revision: number;
}
import type { ConsumptionPayload } from './inventory-movement-api.types';
