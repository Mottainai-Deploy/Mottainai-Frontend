import type { CreateDonationPayload, DonationResponse, DonationStatus } from '@/types/donation-api.types';
import type { OperationalQuery } from '@/types/operational-query.types';
import { apiRequest, serviceError } from './apiClient';
import { operationalId, operationalQuery, operationalStatus, donationPayload } from '@/utils/operationalValidation';
import { validateFinishKey } from '@/utils/inventoryValidation';

export async function getDonations(query: OperationalQuery, signal?: AbortSignal): Promise<DonationResponse[]> {
  try {
    return await apiRequest<DonationResponse[]>(`/donations?${operationalQuery(query)}`, { signal });
  } catch (error) {
    throw serviceError(error, 'Não foi possível concluir a operação.');
  }
}

export async function getDonation(id: number, signal?: AbortSignal): Promise<DonationResponse> {
  try {
    return await apiRequest<DonationResponse>(`/donations/${operationalId(id)}`, { signal });
  } catch (error) {
    throw serviceError(error, 'Não foi possível concluir a operação.');
  }
}

export async function createDonation(payload: CreateDonationPayload, key: string): Promise<DonationResponse> {
  try {
    validateFinishKey(key);
    return await apiRequest<DonationResponse>('/donations', { method: 'POST', body: donationPayload(payload), headers: { 'Idempotency-Key': key } });
  } catch (error) {
    throw serviceError(error, 'Não foi possível concluir a operação.');
  }
}

export async function updateDonationStatus(id: number, status: Exclude<DonationStatus, 'REGISTERED'>): Promise<DonationResponse> {
  try {
    return await apiRequest<DonationResponse>(`/donations/${operationalId(id)}/status`, { method: 'PATCH', body: { status: operationalStatus(status, ['COMPLETED', 'CANCELED']) } });
  } catch (error) {
    throw serviceError(error, 'Não foi possível concluir a operação.');
  }
}
