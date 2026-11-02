import type { ApiAlert, AlertStatus } from '@/types/alert-api.types';
import { apiRequest, serviceError } from './apiClient';
import { getCurrentStoreId } from './profileService';
import { requireInventoryId } from '@/utils/inventoryValidation';
import { validateAlertStatus } from '@/utils/alertPresentation';

export async function getStoreAlerts(signal?: AbortSignal): Promise<ApiAlert[]> {
  try {
    const storeId = await getCurrentStoreId(signal);
    return await apiRequest<ApiAlert[]>(`/alerts?${new URLSearchParams({ storeId: String(storeId) })}`, { signal });
  } catch (error) { throw serviceError(error, 'Não foi possível consultar os alertas da sua loja.'); }
}

export async function getAlert(id: string, signal?: AbortSignal): Promise<ApiAlert> {
  try { return await apiRequest<ApiAlert>(`/alerts/${requireInventoryId(id)}`, { signal }); }
  catch (error) { throw serviceError(error, 'Não foi possível consultar o alerta.'); }
}

export async function updateAlertStatus(id: string, status: AlertStatus): Promise<ApiAlert> {
  try {
    const alertId = requireInventoryId(id);
    validateAlertStatus(status);
    return await apiRequest<ApiAlert>(`/alerts/${alertId}/status`, { method: 'PATCH', body: { status } });
  } catch (error) { throw serviceError(error, 'Não foi possível alterar o status do alerta.'); }
}
