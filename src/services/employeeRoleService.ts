import type { ApiEmployeeRole } from '@/types/employee-api.types';
import { apiRequest, serviceError } from './apiClient';

export async function getEmployeeRoles(signal?: AbortSignal): Promise<ApiEmployeeRole[]> {
  try { return await apiRequest<ApiEmployeeRole[]>('/employee-roles', { signal }); }
  catch (error) { throw serviceError(error, 'Não foi possível consultar os cargos.'); }
}
