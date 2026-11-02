import type { ApiAuditLog } from '@/types/audit-api.types';
import type { OperationDateRange } from '@/types/stock-disposal.types';
import { operationDateParams } from '@/utils/operationDateRange';
import { apiRequest, serviceError } from './apiClient';

export async function getAuditLogs(range: OperationDateRange, signal?: AbortSignal): Promise<ApiAuditLog[]> {
  try {
    return await apiRequest<ApiAuditLog[]>(`/audit-logs?${operationDateParams(range)}`, { signal });
  } catch (error) { throw serviceError(error, 'Não foi possível consultar a auditoria.'); }
}
