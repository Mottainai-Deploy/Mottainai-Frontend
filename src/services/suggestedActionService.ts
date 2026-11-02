import type { ApiSuggestedAction, SuggestedActionDecision } from '@/types/alert-api.types';
import { apiRequest, serviceError } from './apiClient';
import { requireInventoryId } from '@/utils/inventoryValidation';
import { validateSuggestedDecision } from '@/utils/alertPresentation';
import type { ExecutionContext, ExecutionPayload, ExecutionResult } from '@/types/suggested-execution.types';
import type { SuggestedActionType } from '@/types/alert-api.types';
import { ApiRequestError } from './apiClient';
import { getCurrentProfile } from './profileService';
import { getProducts } from './productService';
import { getInventoryRows } from './inventoryService';
import { getSuppliers } from './supplierService';
import { getStores } from './storeService';
import { usesExecutionBatches } from '@/utils/suggestedExecutionValidation';
import { validateFinishKey } from '@/utils/inventoryValidation';

export async function getSuggestedActions(alertId: string, signal?: AbortSignal): Promise<ApiSuggestedAction[]> {
  try { return await apiRequest<ApiSuggestedAction[]>(`/alerts/${requireInventoryId(alertId)}/suggested-actions`, { signal }); }
  catch (error) { throw serviceError(error, 'Não foi possível consultar as ações sugeridas.'); }
}

export async function decideSuggestedAction(id: number, decision: SuggestedActionDecision): Promise<ApiSuggestedAction> {
  try {
    const actionId = requireInventoryId(String(id));
    validateSuggestedDecision(decision);
    return await apiRequest<ApiSuggestedAction>(`/suggested-actions/${actionId}/decision`, { method: 'POST', body: { decision } });
  } catch (error) { throw serviceError(error, 'Não foi possível registrar a decisão.'); }
}

export async function getExecutionContext(type: SuggestedActionType, signal?: AbortSignal): Promise<ExecutionContext> {
  try {
    const profile = await getCurrentProfile(signal);
    const [products, inventory, suppliers] = await Promise.all([
      usesExecutionBatches(type) ? Promise.resolve([]) : getProducts(signal),
      usesExecutionBatches(type) ? getInventoryRows(signal) : Promise.resolve([]),
      type === 'CREATE_PURCHASE_ORDER' ? getSuppliers(signal) : Promise.resolve([]),
    ]);
    let stores: ExecutionContext['stores'] = [];
    let storeListAvailable = true;
    if (type === 'CREATE_TRANSFER') {
      try { stores = await getStores(signal); }
      catch (error) { if (error instanceof ApiRequestError && error.status === 403) storeListAvailable = false; else throw error; }
    }
    return { profile, products, inventory, suppliers, stores, storeListAvailable };
  } catch (error) { throw serviceError(error, 'Não foi possível consultar os dados para executar a sugestão.'); }
}

export async function executeSuggestedAction(id: number, payload: ExecutionPayload, key: string): Promise<ExecutionResult> {
  try {
    const actionId = requireInventoryId(String(id));
    validateFinishKey(key);
    if (!payload.items.length) throw new Error('Inclua pelo menos um item.');
    const result = await apiRequest<ExecutionResult>(`/suggested-actions/${actionId}/execute`, { method: 'POST', body: payload, headers: { 'Idempotency-Key': key } });
    if (result.suggestedAction?.id !== id || result.suggestedAction.status !== 'EXECUTED' || !result.entityType) throw new Error('A resposta não confirmou a execução.');
    requireInventoryId(String(result.entityId));
    return result;
  } catch (error) { throw serviceError(error, 'Não foi possível executar a sugestão.'); }
}
