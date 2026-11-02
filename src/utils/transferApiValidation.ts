import type { ApiTransfer, ApiTransferForm, TransferAction, TransferFormErrors, TransferPayload } from '@/types/transfer-api.types';
import type { InventoryRow } from '@/types/inventory-api.types';
import { requireInventoryId } from './inventoryValidation';

export const transferStatusLabels = { REQUESTED: 'Solicitada', IN_TRANSIT: 'Em trânsito', COMPLETED: 'Concluída', CANCELED: 'Cancelada' } as const;
export const transferActionLabels: Record<TransferAction, string> = { send: 'Enviar transferência', receive: 'Confirmar recebimento', cancel: 'Cancelar envio' };
export const transferActionDescriptions: Record<TransferAction, string> = {
  send: 'O envio retira as quantidades da loja de origem.',
  receive: 'O recebimento adiciona as quantidades à loja de destino e conclui a transferência.',
  cancel: 'O cancelamento devolve as quantidades à loja de origem e encerra a transferência.',
};

export function allowedTransferActions(transfer: ApiTransfer, storeId: number): TransferAction[] {
  if (transfer.status === 'REQUESTED' && transfer.sourceStoreId === storeId) return ['send'];
  if (transfer.status === 'IN_TRANSIT') {
    if (transfer.sourceStoreId === storeId) return ['cancel'];
    if (transfer.destinationStoreId === storeId) return ['receive'];
  }
  return [];
}

export function transferFormErrors(form: ApiTransferForm, inventory: InventoryRow[], sourceStoreId: number): TransferFormErrors {
  const errors: TransferFormErrors = {};
  try {
    if (requireInventoryId(form.destinationStoreId) === sourceStoreId) errors.destinationStoreId = 'A loja de destino deve ser diferente da origem.';
  } catch { errors.destinationStoreId = 'Selecione uma loja de destino válida.'; }
  if (form.observation.trim().length > 500) errors.observation = 'Use até 500 caracteres.';
  if (form.items.length === 0) errors.items = 'Inclua ao menos um lote.';
  const batches = new Set<number>();
  for (const draft of form.items) {
    const row = inventory.find((item) => String(item.id) === draft.inventoryId && item.storeId === sourceStoreId && item.inventoryType === 'NORMAL');
    const quantity = draft.quantity.trim().replace(',', '.');
    if (!row || !/^\d{1,7}(\.\d{1,3})?$/.test(quantity) || Number(quantity) <= 0) errors.items = 'Selecione cada lote e informe quantidades positivas com até três casas decimais.';
    else {
      if (Number(quantity) > row.currentQuantity) errors.items = 'Uma quantidade excede o saldo consultado. Atualize o estoque antes de solicitar.';
      if (batches.has(row.batchId)) errors.items = 'Cada lote deve aparecer somente uma vez.';
      batches.add(row.batchId);
    }
  }
  return errors;
}

export function toTransferPayload(form: ApiTransferForm, inventory: InventoryRow[], sourceStoreId: number): TransferPayload {
  const errors = transferFormErrors(form, inventory, sourceStoreId);
  if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
  return { destinationStoreId: requireInventoryId(form.destinationStoreId), observation: form.observation.trim(), items: form.items.map((draft) => {
    const row = inventory.find((item) => String(item.id) === draft.inventoryId);
    if (!row) throw new Error('Lote indisponível.');
    return { batchId: row.batchId, transferredQuantity: Number(draft.quantity.trim().replace(',', '.')) };
  }) };
}

export function validateTransferPayload(payload: TransferPayload): void {
  requireInventoryId(String(payload.destinationStoreId));
  if (!payload.items.length || payload.observation.length > 500) throw new Error('Confira os lotes e a observação.');
  const batches = new Set<number>();
  for (const item of payload.items) {
    requireInventoryId(String(item.batchId));
    if (!Number.isFinite(item.transferredQuantity) || item.transferredQuantity <= 0 || !/^\d{1,7}(\.\d{1,3})?$/.test(String(item.transferredQuantity))) throw new Error('Quantidade de transferência inválida.');
    if (batches.has(item.batchId)) throw new Error('Um lote não pode ser repetido.');
    batches.add(item.batchId);
  }
}
