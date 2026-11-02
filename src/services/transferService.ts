import type { ApiTransfer, TransferContext, TransferPayload } from '@/types/transfer-api.types';
import type { OperationDateRange } from '@/types/stock-disposal.types';
import { operationDateParams } from '@/utils/operationDateRange';
import { requireInventoryId, validateFinishKey } from '@/utils/inventoryValidation';
import { validateTransferPayload } from '@/utils/transferApiValidation';
import { apiRequest, ApiRequestError, serviceError } from './apiClient';
import { getCurrentProfile, getCurrentStoreId } from './profileService';
import { getStores } from './storeService';

export async function getTransferContext(signal?: AbortSignal): Promise<TransferContext> {
  try {
    const profile = await getCurrentProfile(signal);
    requireInventoryId(String(profile.storeId));
    try { return { profile, stores: await getStores(signal), storeListAvailable: true }; }
    catch (error) {
      if (error instanceof ApiRequestError && error.status === 403) return { profile, stores: [], storeListAvailable: false };
      throw error;
    }
  } catch (error) { throw serviceError(error, 'Não foi possível consultar as lojas para transferência.'); }
}

export async function getTransfers(range: OperationDateRange, signal?: AbortSignal): Promise<ApiTransfer[]> {
  try {
    const params = operationDateParams(range);
    params.set('storeId', String(await getCurrentStoreId(signal)));
    return await apiRequest<ApiTransfer[]>(`/transfers?${params}`, { signal });
  } catch (error) { throw serviceError(error, 'Não foi possível consultar as transferências.'); }
}
export async function getTransfer(id: string, signal?: AbortSignal): Promise<ApiTransfer> {
  try { requireInventoryId(id); return await apiRequest<ApiTransfer>(`/transfers/${id}`, { signal }); }
  catch (error) { throw serviceError(error, 'Não foi possível consultar a transferência.'); }
}
export async function createTransfer(payload: TransferPayload, key: string): Promise<ApiTransfer> {
  try {
    validateTransferPayload(payload); validateFinishKey(key);
    return await apiRequest<ApiTransfer>('/transfers', { method: 'POST', body: payload, headers: { 'Idempotency-Key': key } });
  } catch (error) { throw serviceError(error, 'Não foi possível solicitar a transferência.'); }
}
export async function updateTransferStatus(id: string, status: 'IN_TRANSIT' | 'CANCELED'): Promise<ApiTransfer> {
  try {
    requireInventoryId(id);
    if (status !== 'IN_TRANSIT' && status !== 'CANCELED') throw new Error('Transição de transferência inválida.');
    return await apiRequest<ApiTransfer>(`/transfers/${id}/status`, { method: 'PATCH', body: { status } });
  } catch (error) { throw serviceError(error, 'Não foi possível atualizar a transferência.'); }
}
export async function receiveTransfer(id: string, key: string): Promise<ApiTransfer> {
  try {
    requireInventoryId(id); validateFinishKey(key);
    return await apiRequest<ApiTransfer>(`/transfers/${id}/receive`, { method: 'POST', headers: { 'Idempotency-Key': key } });
  } catch (error) { throw serviceError(error, 'Não foi possível confirmar o recebimento.'); }
}
