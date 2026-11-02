import type { AddressResponse } from '@/types/address-api.types';
import { apiPages, apiRequest, serviceError } from './apiClient';
import { operationalId } from '@/utils/operationalValidation';

export async function getAddresses(signal?: AbortSignal): Promise<AddressResponse[]> {
  try {
    return await apiPages<AddressResponse>('/addresses', signal);
  } catch (error) { throw serviceError(error, 'Não foi possível carregar os endereços.'); }
}

export async function getAddress(id: number, signal?: AbortSignal): Promise<AddressResponse> {
  try { return await apiRequest<AddressResponse>(`/addresses/${operationalId(id)}`, { signal }); }
  catch (error) { throw serviceError(error, 'Não foi possível carregar o endereço.'); }
}
