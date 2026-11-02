export type TransferFormStatus = 'REQUESTED' | 'APPROVED' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';

export interface TransferFormState {
  suggestedActionId: string;
  sourceStoreId: string;
  destinationStoreId: string;
  employeeId: string;
  requestDate: string;
  completionDate: string;
  status: TransferFormStatus;
  observation: string;
}
