import type { DisposalForm, DisposalPayload, DisposalAttempt } from '@/types/stock-disposal.types';
import type { ConsumptionPayload } from '@/types/inventory-movement-api.types';
import type { InventoryRow } from '@/types/inventory-api.types';
import { requireInventoryId } from './inventoryValidation';

export function disposalErrors(form: DisposalForm, inventory: InventoryRow[]): Partial<Record<keyof DisposalForm, string>> {
  const errors: Partial<Record<keyof DisposalForm, string>> = {};
  const item = inventory.find((entry) => String(entry.id) === form.inventoryId);
  if (!item || item.inventoryType !== 'NORMAL') errors.inventoryId = 'Selecione um lote do estoque normal.';
  const quantity = form.quantity.trim().replace(',', '.');
  if (!/^\d{1,7}(\.\d{1,3})?$/.test(quantity) || Number(quantity) <= 0) {
    errors.quantity = 'Informe uma quantidade maior que zero, com até 7 dígitos inteiros e 3 decimais.';
  } else if (item && Number(quantity) > item.currentQuantity) errors.quantity = 'A quantidade informada excede o saldo consultado.';
  if (!['Avaria', 'Vencimento', 'Consumo interno'].includes(form.reason)) errors.reason = 'Selecione um motivo disponível.';
  if (form.observation.trim().length > 500) errors.observation = 'Use até 500 caracteres na observação.';
  return errors;
}

export function disposalPayload(form: DisposalForm, inventory: InventoryRow[]): DisposalPayload {
  const errors = disposalErrors(form, inventory);
  if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
  if (form.reason === 'Consumo interno') throw new Error('Consumo interno deve ser registrado como saída de estoque.');
  const selected = inventory.find((item) => String(item.id) === form.inventoryId);
  if (!selected) throw new Error('O item de estoque não está disponível.');
  return { reason: form.reason, observation: form.observation.trim(),
    items: [{ batchId: requireInventoryId(String(selected.batchId)), disposedQuantity: Number(form.quantity.trim().replace(',', '.')) }] };
}

export function stockExitAttempt(form: DisposalForm, inventory: InventoryRow[], key: string): DisposalAttempt {
  const errors = disposalErrors(form, inventory);
  if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
  if (form.reason === 'Consumo interno') {
    const note = form.observation.trim();
    return { kind: 'consumption', key, inventoryId: requireInventoryId(form.inventoryId),
      payload: { movementType: 'OUT', movedQuantity: -Number(form.quantity.trim().replace(',', '.')), observation: `Consumo interno${note ? `: ${note}` : ''}` } };
  }
  return { kind: 'disposal', key, payload: disposalPayload(form, inventory) };
}

export function validateConsumptionPayload(payload: ConsumptionPayload): void {
  if (payload.movementType !== 'OUT' || !Number.isFinite(payload.movedQuantity) || payload.movedQuantity >= 0
    || !/^\d{1,7}(\.\d{1,3})?$/.test(String(-payload.movedQuantity))
    || !payload.observation.startsWith('Consumo interno') || payload.observation.length > 2000) {
    throw new Error('Informe uma saída negativa válida e identificada como consumo interno.');
  }
}

export function validateDisposalPayload(payload: DisposalPayload): void {
  if (!payload.reason.trim() || payload.reason.length > 100 || payload.items.length === 0) throw new Error('Informe um motivo e ao menos um lote.');
  const batches = new Set<number>();
  for (const item of payload.items) {
    requireInventoryId(String(item.batchId));
    if (!Number.isFinite(item.disposedQuantity) || item.disposedQuantity <= 0
      || !/^\d{1,7}(\.\d{1,3})?$/.test(String(item.disposedQuantity))) throw new Error('Informe uma quantidade positiva com até três casas decimais.');
    if (batches.has(item.batchId)) throw new Error('Um lote não pode aparecer mais de uma vez.');
    batches.add(item.batchId);
  }
}
