import type { CreateReceivingPayload, ReceivingResponse, ReceivingStatus } from '@/types/receiving-api.types';
import type { OperationalQuery } from '@/types/operational-query.types';
import { apiRequest, serviceError } from './apiClient';
import { operationalId, operationalQuery, operationalStatus, receivingPayload } from '@/utils/operationalValidation';
import { validateFinishKey } from '@/utils/inventoryValidation';

export async function getReceivings(query: OperationalQuery, signal?: AbortSignal): Promise<ReceivingResponse[]> {
  try {
    return await apiRequest<ReceivingResponse[]>(`/receivings?${operationalQuery(query)}`, { signal });
  } catch (error) {
    throw serviceError(error, 'Não foi possível concluir a operação.');
  }
}

export async function getReceiving(id: number, signal?: AbortSignal): Promise<ReceivingResponse> {
  try {
    return await apiRequest<ReceivingResponse>(`/receivings/${operationalId(id)}`, { signal });
  } catch (error) {
    throw serviceError(error, 'Não foi possível concluir a operação.');
  }
}

export async function createReceiving(payload: CreateReceivingPayload, key: string): Promise<ReceivingResponse> {
  try {
    validateFinishKey(key);
    return await apiRequest<ReceivingResponse>('/receivings', { method: 'POST', body: receivingPayload(payload), headers: { 'Idempotency-Key': key } });
  } catch (error) {
    throw serviceError(error, 'Não foi possível concluir a operação.');
  }
}

export async function updateReceivingStatus(id: number, status: Exclude<ReceivingStatus, 'PENDING'>): Promise<ReceivingResponse> {
  try {
    return await apiRequest<ReceivingResponse>(`/receivings/${operationalId(id)}/status`, { method: 'PATCH', body: { status: operationalStatus(status, ['CONFIRMED', 'DIVERGENT']) } });
  } catch (error) {
    throw serviceError(error, 'Não foi possível concluir a operação.');
  }
}
