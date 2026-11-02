import type { InventoryCount, InventoryCountItem, CountItemForm } from '@/types/inventory-count-api.types';
import { requireInventoryId, validateCountObservation, toCountItemPayload, validateFinishKey } from '@/utils/inventoryValidation';
import { apiRequest, serviceError } from './apiClient';

export async function getInventoryCounts(signal?: AbortSignal): Promise<InventoryCount[]> {
  try { return await apiRequest<InventoryCount[]>('/inventory-counts', { signal }); }
  catch (error) { throw serviceError(error, 'Não foi possível consultar as contagens.'); }
}

export async function getInventoryCount(id: string, signal?: AbortSignal): Promise<InventoryCount> {
  try {
    requireInventoryId(id);
    return await apiRequest<InventoryCount>(`/inventory-counts/${id}`, { signal });
  } catch (error) { throw serviceError(error, 'Não foi possível carregar a contagem.'); }
}

export async function createInventoryCount(observation: string): Promise<InventoryCount> {
  try {
    const body = { observation: validateCountObservation(observation) };
    return await apiRequest<InventoryCount>('/inventory-counts', { method: 'POST', body });
  } catch (error) { throw serviceError(error, 'Não foi possível criar a contagem.'); }
}

export async function saveInventoryCountItem(countId: string, form: CountItemForm, itemId?: number): Promise<InventoryCountItem> {
  try {
    requireInventoryId(countId);
    const payload = toCountItemPayload(form);
    if (itemId !== undefined) {
      requireInventoryId(String(itemId));
      return await apiRequest<InventoryCountItem>(`/inventory-counts/${countId}/items/${itemId}`, {
        method: 'PUT', body: { countedQuantity: payload.countedQuantity, observation: payload.observation },
      });
    }
    return await apiRequest<InventoryCountItem>(`/inventory-counts/${countId}/items`, { method: 'POST', body: payload });
  } catch (error) { throw serviceError(error, 'Não foi possível salvar o item da contagem.'); }
}

export async function finishInventoryCount(countId: string, key: string): Promise<InventoryCount> {
  try {
    requireInventoryId(countId);
    validateFinishKey(key);
    return await apiRequest<InventoryCount>(`/inventory-counts/${countId}/finish`, { method: 'POST', headers: { 'Idempotency-Key': key } });
  } catch (error) { throw serviceError(error, 'Não foi possível finalizar a contagem.'); }
}

export async function deleteInventoryCountItem(countId: string, itemId: number): Promise<void> {
  try {
    requireInventoryId(countId);
    requireInventoryId(String(itemId));
    return await apiRequest<void>(`/inventory-counts/${countId}/items/${itemId}`, { method: 'DELETE' });
  } catch (error) { throw serviceError(error, 'Não foi possível remover o item da contagem.'); }
}
