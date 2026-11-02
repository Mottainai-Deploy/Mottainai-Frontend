import type { BatchResponse } from '@/types/batch-api.types';
import { apiRequest, serviceError } from './apiClient';
import { operationalId } from '@/utils/operationalValidation';
import { productActive } from '@/utils/productOperationsValidation';

export async function getBatches(signal?: AbortSignal): Promise<BatchResponse[]> {
  try { return await apiRequest<BatchResponse[]>('/batches', { signal }); }
  catch (error) { throw serviceError(error, 'Não foi possível consultar os lotes.'); }
}

export async function updateBatchStatus(id: number, active: boolean): Promise<BatchResponse> {
  try { return await apiRequest<BatchResponse>(`/batches/${operationalId(id)}/status`, { method: 'PATCH', body: { active: productActive(active) } }); }
  catch (error) { throw serviceError(error, 'Não foi possível alterar o status do lote.'); }
}
