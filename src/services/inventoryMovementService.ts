import type { ConsumptionPayload, InventoryMovementResponse } from '@/types/inventory-movement-api.types';
import type { OperationDateRange } from '@/types/stock-disposal.types';
import { operationDateParams } from '@/utils/operationDateRange';
import { validateConsumptionPayload } from '@/utils/disposalValidation';
import { requireInventoryId, validateFinishKey } from '@/utils/inventoryValidation';
import { apiRequest, serviceError } from './apiClient';
import { getCurrentStoreId } from './profileService';

export async function getInventoryMovements(range: OperationDateRange, signal?: AbortSignal): Promise<InventoryMovementResponse[]> {
  try {
    const params = operationDateParams(range);
    params.set('storeId', String(await getCurrentStoreId(signal)));
    return await apiRequest<InventoryMovementResponse[]>(`/inventory-movements?${params}`, { signal });
  }
  catch (error) { throw serviceError(error, 'Não foi possível consultar as movimentações.'); }
}

export async function createConsumption(inventoryId: number, payload: ConsumptionPayload, key: string): Promise<InventoryMovementResponse> {
  try {
    requireInventoryId(String(inventoryId));
    validateConsumptionPayload(payload);
    validateFinishKey(key);
    return await apiRequest<InventoryMovementResponse>(`/inventory/${inventoryId}/movements`, {
      method: 'POST', body: payload, headers: { 'Idempotency-Key': key },
    });
  } catch (error) { throw serviceError(error, 'Não foi possível registrar o consumo interno.'); }
}
