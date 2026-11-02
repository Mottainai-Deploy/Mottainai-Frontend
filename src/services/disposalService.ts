import type { DisposalPayload, DisposalResponse, OperationDateRange } from '@/types/stock-disposal.types';
import { operationDateParams } from '@/utils/operationDateRange';
import { validateDisposalPayload } from '@/utils/disposalValidation';
import { validateFinishKey } from '@/utils/inventoryValidation';
import { apiRequest, serviceError } from './apiClient';
import { getCurrentStoreId } from './profileService';

export async function getDisposals(range: OperationDateRange, signal?: AbortSignal): Promise<DisposalResponse[]> {
  try {
    const params = operationDateParams(range);
    params.set('storeId', String(await getCurrentStoreId(signal)));
    return await apiRequest<DisposalResponse[]>(`/disposals?${params}`, { signal });
  }
  catch (error) { throw serviceError(error, 'Não foi possível consultar os descartes.'); }
}

export async function createDisposal(payload: DisposalPayload, key: string): Promise<DisposalResponse> {
  try {
    validateDisposalPayload(payload);
    validateFinishKey(key);
    return await apiRequest<DisposalResponse>('/disposals', { method: 'POST', body: payload, headers: { 'Idempotency-Key': key } });
  } catch (error) { throw serviceError(error, 'Não foi possível registrar o descarte.'); }
}
