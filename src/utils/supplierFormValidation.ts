import type { SupplierFormState, SupplierEditState } from '@/types/supplier.types';
import { isValidEmailAddress } from './emailValidation.ts';

export type SupplierFormErrors = Partial<Record<keyof SupplierFormState, string>>;

export function validateSupplierForm(form: SupplierFormState): SupplierFormErrors {
  const errors: SupplierFormErrors = {};
  const cnpjDigits = form.cnpj.replace(/\D/g, '');
  const email = form.email.trim();
  const phoneDigits = form.phone.replace(/\D/g, '');

  if (!form.tradeName.trim()) errors.tradeName = 'Informe o nome do fornecedor.';
  else if (form.tradeName.trim().length > 150) errors.tradeName = 'Use até 150 caracteres.';

  if (!/^[1-9]\d*$/.test(form.addressId)) errors.addressId = 'Selecione o endereço vinculado.';
  if (cnpjDigits.length !== 14) errors.cnpj = 'Informe um CNPJ com 14 dígitos.';
  if (email && !isValidEmailAddress(email)) errors.email = 'Informe um e-mail válido.';
  else if (email.length > 150) errors.email = 'Use até 150 caracteres.';
  if (phoneDigits && (phoneDigits.length < 10 || phoneDigits.length > 13)) {
    errors.phone = 'Informe um telefone com DDD e até 13 dígitos.';
  }

  return errors;
}

export function sanitizeSupplierForm(form: SupplierFormState): SupplierFormState {
  return {
    addressId: form.addressId,
    tradeName: form.tradeName.trim().slice(0, 150),
    cnpj: form.cnpj.replace(/\D/g, '').slice(0, 14),
    email: form.email.trim().slice(0, 150),
    phone: form.phone.trim().slice(0, 20),
    active: form.active,
  };
}

export function validateSupplierEdit(id: string, draft: SupplierEditState): void {
  if (!/^[1-9]\d*$/.test(id) || !draft.tradeName.trim() || draft.tradeName.trim().length > 150) {
    throw new Error('Informe um fornecedor e um apelido válido de até 150 caracteres.');
  }
  if (typeof draft.active !== 'boolean') throw new Error('Informe um status válido.');
  if (draft.email !== undefined && (draft.email.trim().length > 150 || (draft.email.trim() && !isValidEmailAddress(draft.email.trim())))) throw new Error('Informe um e-mail válido com até 150 caracteres.');
  if (draft.phone !== undefined && draft.phone.trim().length > 20) throw new Error('O telefone deve ter até 20 caracteres.');
}
