import type { TaxProfileResponse } from '@/types/tax-profile-api.types';
import { apiPages, serviceError } from './apiClient';

export async function getTaxProfiles(signal?: AbortSignal): Promise<TaxProfileResponse[]> {
  try {
    return await apiPages<TaxProfileResponse>('/tax-profiles', signal);
  } catch (error) { throw serviceError(error, 'Não foi possível consultar os perfis fiscais.'); }
}
