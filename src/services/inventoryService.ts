import type { InventoryResponse, InventoryRow } from '@/types/inventory-api.types';
import { inventoryRows } from '@/utils/inventoryPresentation';
import { apiRequest, serviceError } from './apiClient';
import { getBatches } from './batchService';
import { getProducts } from './productService';
import { getCurrentStoreId } from './profileService';

export async function getInventory(signal?: AbortSignal): Promise<InventoryResponse[]> {
  try {
    const storeId = await getCurrentStoreId(signal);
    return await apiRequest<InventoryResponse[]>(`/inventory?storeId=${storeId}`, { signal });
  }
  catch (error) { throw serviceError(error, 'Não foi possível consultar o estoque.'); }
}

export async function getInventoryRows(signal?: AbortSignal): Promise<InventoryRow[]> {
  try {
    const [inventory, batches, products] = await Promise.all([getInventory(signal), getBatches(signal), getProducts(signal)]);
    return inventoryRows(inventory, batches, products);
  } catch (error) { throw serviceError(error, 'Não foi possível carregar o estoque por lote.'); }
}
