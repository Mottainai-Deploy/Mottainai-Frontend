import type { ApiProfile } from '@/types/api.types';
import { requireInventoryId } from '@/utils/inventoryValidation';
import { apiRequest, getApiReadRevision, serviceError } from './apiClient';

const STORE_REUSE_DURATION_MS = 5_000;
let cachedStoreId: number | null = null;
let cachedReadRevision = -1;
let storeExpiresAt = 0;

export async function getCurrentProfile(signal?: AbortSignal): Promise<ApiProfile> {
  const revision = getApiReadRevision();
  try {
    const profile = await apiRequest<ApiProfile>('/auth/profile', { signal });
    // O perfil continua sendo consultado; só o ID da loja é reaproveitado brevemente.
    if (revision === getApiReadRevision()) {
      cachedStoreId = Number.isSafeInteger(profile.storeId) && profile.storeId > 0 ? profile.storeId : null;
      cachedReadRevision = revision;
      storeExpiresAt = performance.now() + STORE_REUSE_DURATION_MS;
    }
    return profile;
  }
  catch (error) { throw serviceError(error, 'Não foi possível consultar o perfil autenticado.'); }
}

export async function getCurrentStoreId(signal?: AbortSignal): Promise<number> {
  try {
    signal?.throwIfAborted();
    if (cachedStoreId !== null && cachedReadRevision === getApiReadRevision() && performance.now() < storeExpiresAt) {
      return cachedStoreId;
    }
    return requireInventoryId(String((await getCurrentProfile(signal)).storeId));
  }
  catch (error) { throw serviceError(error, 'A conta não possui uma loja válida.'); }
}
