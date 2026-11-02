import type { StoreSummary } from '@/types/store-api.types';
import { apiPages, serviceError } from './apiClient';

export async function getStores(signal?: AbortSignal): Promise<StoreSummary[]> {
  try {
    return await apiPages<StoreSummary>('/stores', signal);
  } catch (error) { throw serviceError(error, 'Não foi possível consultar as lojas.'); }
}
