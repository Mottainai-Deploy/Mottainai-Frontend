import type { CreateReplenishmentExecutionPayload, ReplenishmentExecutionResponse, ReplenishmentPreListResponse } from '@/types/replenishment-api.types';
import type { OperationalQuery } from '@/types/operational-query.types';
import { apiRequest, serviceError } from './apiClient';
import { operationalId, operationalQuery, replenishmentPayload } from '@/utils/operationalValidation';
import { validateFinishKey } from '@/utils/inventoryValidation';

export async function generateReplenishmentPreList(key: string): Promise<ReplenishmentPreListResponse> {
  try {
    validateFinishKey(key);
    return await apiRequest<ReplenishmentPreListResponse>('/replenishments/pre-lists', { method: 'POST', headers: { 'Idempotency-Key': key } });
  } catch (error) {
    throw serviceError(error, 'Não foi possível concluir a operação.');
  }
}

export async function getReplenishmentPreLists(storeId: number, signal?: AbortSignal): Promise<ReplenishmentPreListResponse[]> {
  try {
    return await apiRequest<ReplenishmentPreListResponse[]>(`/replenishments/pre-lists?storeId=${operationalId(storeId)}`, { signal });
  } catch (error) {
    throw serviceError(error, 'Não foi possível concluir a operação.');
  }
}

export async function getReplenishmentPreList(id: number, signal?: AbortSignal): Promise<ReplenishmentPreListResponse> {
  try {
    return await apiRequest<ReplenishmentPreListResponse>(`/replenishments/pre-lists/${operationalId(id)}`, { signal });
  } catch (error) {
    throw serviceError(error, 'Não foi possível concluir a operação.');
  }
}

export async function executeReplenishment(payload: CreateReplenishmentExecutionPayload, key: string): Promise<ReplenishmentExecutionResponse> {
  try {
    validateFinishKey(key);
    return await apiRequest<ReplenishmentExecutionResponse>('/replenishments/executions', { method: 'POST', body: replenishmentPayload(payload), headers: { 'Idempotency-Key': key } });
  } catch (error) {
    throw serviceError(error, 'Não foi possível concluir a operação.');
  }
}

export async function getReplenishmentExecutions(query: OperationalQuery, signal?: AbortSignal): Promise<ReplenishmentExecutionResponse[]> {
  try {
    return await apiRequest<ReplenishmentExecutionResponse[]>(`/replenishments/executions?${operationalQuery(query)}`, { signal });
  } catch (error) {
    throw serviceError(error, 'Não foi possível concluir a operação.');
  }
}

export async function getReplenishmentExecution(id: number, signal?: AbortSignal): Promise<ReplenishmentExecutionResponse> {
  try {
    return await apiRequest<ReplenishmentExecutionResponse>(`/replenishments/executions/${operationalId(id)}`, { signal });
  } catch (error) {
    throw serviceError(error, 'Não foi possível concluir a operação.');
  }
}
