import type { CreatePurchaseOrderPayload, UpdatePurchaseOrderPayload, PurchaseOrderResponse, PurchaseOrderStatus } from '@/types/purchase-order-api.types';
import type { OperationalQuery } from '@/types/operational-query.types';
import { apiRequest, serviceError } from './apiClient';
import { operationalId, operationalQuery, operationalStatus, purchasePayload, purchaseUpdatePayload } from '@/utils/operationalValidation';
import { validateFinishKey } from '@/utils/inventoryValidation';

export async function getPurchaseOrders(query: OperationalQuery, signal?: AbortSignal): Promise<PurchaseOrderResponse[]> {
  try {
    return await apiRequest<PurchaseOrderResponse[]>(`/purchase-orders?${operationalQuery(query)}`, { signal });
  } catch (error) {
    throw serviceError(error, 'Não foi possível concluir a operação.');
  }
}

export async function getPurchaseOrder(id: number, signal?: AbortSignal): Promise<PurchaseOrderResponse> {
  try {
    return await apiRequest<PurchaseOrderResponse>(`/purchase-orders/${operationalId(id)}`, { signal });
  } catch (error) {
    throw serviceError(error, 'Não foi possível concluir a operação.');
  }
}

export async function createPurchaseOrder(payload: CreatePurchaseOrderPayload, key: string): Promise<PurchaseOrderResponse> {
  try {
    validateFinishKey(key);
    return await apiRequest<PurchaseOrderResponse>('/purchase-orders', { method: 'POST', body: purchasePayload(payload), headers: { 'Idempotency-Key': key } });
  } catch (error) {
    throw serviceError(error, 'Não foi possível concluir a operação.');
  }
}

export async function updatePurchaseOrder(id: number, payload: UpdatePurchaseOrderPayload): Promise<PurchaseOrderResponse> {
  try {
    return await apiRequest<PurchaseOrderResponse>(`/purchase-orders/${operationalId(id)}`, { method: 'PUT', body: purchaseUpdatePayload(payload) });
  } catch (error) {
    throw serviceError(error, 'Não foi possível concluir a operação.');
  }
}

export async function updatePurchaseOrderStatus(id: number, status: Exclude<PurchaseOrderStatus, 'PENDING'>): Promise<PurchaseOrderResponse> {
  try {
    return await apiRequest<PurchaseOrderResponse>(`/purchase-orders/${operationalId(id)}/status`, { method: 'PATCH', body: { status: operationalStatus(status, ['APPROVED', 'CANCELED']) } });
  } catch (error) {
    throw serviceError(error, 'Não foi possível concluir a operação.');
  }
}

export async function deletePurchaseOrder(id: number): Promise<void> {
  try {
    return await apiRequest<void>(`/purchase-orders/${operationalId(id)}`, { method: 'DELETE' });
  } catch (error) {
    throw serviceError(error, 'Não foi possível concluir a operação.');
  }
}
