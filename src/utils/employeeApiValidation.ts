import type { CreateEmployeeInput, EmployeeDraft, UpdateEmployeeInput } from '@/types/employee-api.types';
import { requireInventoryId } from './inventoryValidation';

export function employeeContactInput(draft: EmployeeDraft, requiresEmail: boolean): UpdateEmployeeInput {
  const name = draft.name.trim();
  const email = draft.email.trim().toLowerCase();
  const phone = draft.phone.trim();
  if (!name || name.length > 150) throw new Error('Informe um nome com até 150 caracteres.');
  if ((requiresEmail && !email) || (email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 150))) {
    throw new Error('Informe um e-mail válido. Ele é obrigatório quando há acesso ao sistema.');
  }
  if (phone.length > 20) throw new Error('O telefone deve ter até 20 caracteres.');
  return { name, email: email || null, phone: phone || null, roleId: draft.roleId ? requireInventoryId(draft.roleId) : null };
}

export function employeeCreateInput(draft: EmployeeDraft): CreateEmployeeInput {
  const contact = employeeContactInput(draft, draft.createLogin);
  const cpf = draft.cpf.replace(/\D/g, '');
  if (!/^\d{11}$/.test(cpf)) throw new Error('Informe um CPF com 11 dígitos.');
  const date = new Date(`${draft.hireDate}T12:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.hireDate) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== draft.hireDate) {
    throw new Error('Informe uma data de admissão válida.');
  }
  return { ...contact, cpf, roleId: requireInventoryId(draft.roleId), storeId: requireInventoryId(draft.storeId), hireDate: draft.hireDate, createLogin: draft.createLogin };
}

export function validatedEmployeeUpdate(input: UpdateEmployeeInput): UpdateEmployeeInput {
  return employeeContactInput({ name: input.name, email: input.email ?? '', phone: input.phone ?? '',
    roleId: input.roleId == null ? '' : String(input.roleId), cpf: '', storeId: '', hireDate: '', createLogin: false }, false);
}

export function validatedEmployeeCreate(input: CreateEmployeeInput): CreateEmployeeInput {
  if (typeof input.createLogin !== 'boolean') throw new Error('Informe se o funcionário terá acesso ao sistema.');
  return employeeCreateInput({ name: input.name, email: input.email ?? '', phone: input.phone ?? '',
    roleId: String(input.roleId), cpf: input.cpf, storeId: String(input.storeId), hireDate: input.hireDate, createLogin: input.createLogin });
}
