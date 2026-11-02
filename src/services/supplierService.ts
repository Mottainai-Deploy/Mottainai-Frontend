import type { SupplierRecord, SupplierFormState, SupplierEditState } from '@/types/supplier.types';
import type { SupplierResponse, CreateSupplierPayload, UpdateSupplierPayload } from '@/types/supplier-api.types';
import { sanitizeSupplierForm, validateSupplierForm, validateSupplierEdit } from '@/utils/supplierFormValidation';
import { apiPages, apiRequest, serviceError } from './apiClient';
import { getAddress } from './addressService';
import { operationalId } from '@/utils/operationalValidation';

function toRecord(item: SupplierResponse): SupplierRecord {
  return { id: String(item.id), addressId: item.address.id, tradeName: item.tradeName,
    cnpj: item.cnpj, email: item.email ?? '', phone: item.phone ?? '', active: item.active, linkedSkus: '' };
}

export async function getSuppliers(signal?: AbortSignal): Promise<SupplierRecord[]> {
  try {
    return (await apiPages<SupplierResponse>('/suppliers', signal)).map(toRecord);
  } catch (error) { throw serviceError(error, 'Não foi possível carregar os fornecedores.'); }
}

export async function createSupplier(form: SupplierFormState): Promise<SupplierRecord> {
  try {
    const errors = validateSupplierForm(form);
    if (Object.keys(errors).length) throw new Error('Revise os campos do fornecedor.');
    const clean = sanitizeSupplierForm(form);
    const { id: addressId, ...address } = await getAddress(Number(clean.addressId));
    if (!addressId) throw new Error('Selecione um endereço válido.');
    const body: CreateSupplierPayload = { address, tradeName: clean.tradeName, cnpj: clean.cnpj, email: clean.email, phone: clean.phone };
    const created = await apiRequest<SupplierResponse>('/suppliers', { method: 'POST', body });
    return toRecord(created);
  } catch (error) { throw serviceError(error, 'Não foi possível cadastrar o fornecedor.'); }
}

export async function updateSupplier(id: string, draft: SupplierEditState): Promise<SupplierRecord> {
  try {
    validateSupplierEdit(id, draft);
    const current = await apiRequest<SupplierResponse>(`/suppliers/${id}`);
    const { id: addressId, ...address } = current.address;
    if (!addressId) throw new Error('O fornecedor não possui endereço válido.');
    const body: UpdateSupplierPayload = { address, tradeName: draft.tradeName.trim(),
      active: draft.active, email: draft.email === undefined ? current.email ?? '' : draft.email.trim(), phone: draft.phone === undefined ? current.phone ?? '' : draft.phone.trim() };
    return toRecord(await apiRequest<SupplierResponse>(`/suppliers/${id}`, { method: 'PUT', body }));
  } catch (error) { throw serviceError(error, 'Não foi possível atualizar o fornecedor.'); }
}

export async function deleteSupplier(id: string): Promise<void> {
  try { return await apiRequest<void>(`/suppliers/${operationalId(Number(id))}`, { method: 'DELETE' }); }
  catch (error) { throw serviceError(error, 'Não foi possível excluir o fornecedor.'); }
}
