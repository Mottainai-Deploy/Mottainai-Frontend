import type { CountItemForm, CountItemPayload } from '@/types/inventory-count-api.types';

export function requireInventoryId(id: string): number {
  const value = Number(id);
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(value)) throw new Error('Selecione um identificador válido.');
  return value;
}

export function validateCountObservation(observation: string): string {
  const clean = observation.trim();
  if (clean.length > 2000) throw new Error('A observação deve ter até 2000 caracteres.');
  return clean;
}

export function toCountItemPayload(form: CountItemForm): CountItemPayload {
  const inventoryId = requireInventoryId(form.inventoryId);
  const quantity = form.quantity.trim().replace(',', '.');
  if (!/^\d{1,9}(\.\d{1,3})?$/.test(quantity)) throw new Error('Informe uma quantidade maior ou igual a zero, com até 9 dígitos inteiros e 3 decimais.');
  return { inventoryId, countedQuantity: Number(quantity), observation: validateCountObservation(form.observation) };
}

export function countItemErrors(form: CountItemForm): Partial<Record<keyof CountItemForm, string>> {
  const errors: Partial<Record<keyof CountItemForm, string>> = {};
  try { requireInventoryId(form.inventoryId); } catch { errors.inventoryId = 'Selecione um item do estoque.'; }
  if (!/^\d{1,9}([.,]\d{1,3})?$/.test(form.quantity.trim())) errors.quantity = 'Informe uma quantidade maior ou igual a zero, com até 9 dígitos inteiros e 3 decimais.';
  if (form.observation.trim().length > 2000) errors.observation = 'Use até 2000 caracteres.';
  return errors;
}

export function validateFinishKey(key: string): void {
  if (!key.trim() || key.length > 180) throw new Error('A identificação da finalização é inválida.');
}
