export interface ApiAuditLog {
  auditId: number;
  tableAffected: string;
  operation: string;
  recordId: string;
  userId: number | null;
  oldData: unknown;
  newData: unknown;
  operationDate: string;
}
