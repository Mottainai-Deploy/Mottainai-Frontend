import type { ApiEmployee, CreateEmployeeInput, UpdateEmployeeInput } from '@/types/employee-api.types';
import { apiRequest, serviceError } from './apiClient';
import { requireInventoryId } from '@/utils/inventoryValidation';
import { validatedEmployeeCreate, validatedEmployeeUpdate } from '@/utils/employeeApiValidation';

export async function getStoreEmployees(signal?: AbortSignal): Promise<ApiEmployee[]> {
  try { return await apiRequest<ApiEmployee[]>('/employees-store', { signal }); }
  catch (error) { throw serviceError(error, 'Não foi possível consultar os funcionários da loja.'); }
}

export async function getCompanyEmployees(signal?: AbortSignal): Promise<ApiEmployee[]> {
  try { return await apiRequest<ApiEmployee[]>('/employees-company', { signal }); }
  catch (error) { throw serviceError(error, 'Não foi possível consultar os funcionários da empresa.'); }
}

export async function createEmployee(input: CreateEmployeeInput): Promise<ApiEmployee> {
  try { return await apiRequest<ApiEmployee>('/employees', { method: 'POST', body: validatedEmployeeCreate(input) }); }
  catch (error) { throw serviceError(error, 'Não foi possível cadastrar o funcionário.'); }
}

export async function updateEmployee(id: number, input: UpdateEmployeeInput): Promise<ApiEmployee> {
  try { return await apiRequest<ApiEmployee>(`/employees/${requireInventoryId(String(id))}`, { method: 'PUT', body: validatedEmployeeUpdate(input) }); }
  catch (error) { throw serviceError(error, 'Não foi possível atualizar o funcionário.'); }
}

export async function changeEmployeeStatus(id: number, active: boolean): Promise<ApiEmployee> {
  try {
    if (typeof active !== 'boolean') throw new Error('Informe um estado de ativação válido.');
    return await apiRequest<ApiEmployee>(`/employees/${requireInventoryId(String(id))}/status`, { method: 'PUT', body: { active } });
  }
  catch (error) { throw serviceError(error, 'Não foi possível alterar o status.'); }
}

export async function inviteEmployee(id: number): Promise<ApiEmployee> {
  try { return await apiRequest<ApiEmployee>(`/employees/${requireInventoryId(String(id))}/invite`, { method: 'POST' }); }
  catch (error) { throw serviceError(error, 'Não foi possível solicitar o convite.'); }
}
