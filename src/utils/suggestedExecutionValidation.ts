import type { ApiSuggestedAction, SuggestedActionType } from '@/types/alert-api.types';
import type { ExecutionContext, ExecutionDraft, ExecutionDraftItem, ExecutionPayload } from '@/types/suggested-execution.types';
import { requireInventoryId } from './inventoryValidation';

export const executionEffects: Record<SuggestedActionType, string> = {
  CREATE_PURCHASE_ORDER: 'Cria um pedido de compra. Não registra recebimento nem entrada no estoque.',
  CREATE_PROMOTION: 'Cria uma promoção inativa, pendente de aprovação. Não publica os preços automaticamente.',
  CREATE_TRANSFER: 'Cria uma solicitação de transferência. O envio e o recebimento continuam sendo etapas separadas.',
  CREATE_DONATION: 'Cria um registro de doação. A entrega e a baixa do estoque continuam sendo etapas separadas.',
  CREATE_DISPOSAL: 'Registra o descarte e retira imediatamente as quantidades do estoque normal da loja.',
  CREATE_REPLENISHMENT: 'Cria uma pré-lista de reposição. Não executa a movimentação para a área de venda.',
};
export const promotionTypeLabels: Record<string, string> = { DISCOUNT_PERCENT: 'Desconto percentual', DISCOUNT_FIXED: 'Desconto fixo', SPECIAL_PRICE: 'Preço especial' };
export const executionEntityLabels: Record<string, string> = { purchase_order: 'Pedido de compra', promotion: 'Promoção', transfer: 'Transferência', donation: 'Doação', disposal: 'Descarte', replenishment_pre_list: 'Pré-lista de reposição' };
export function usesExecutionBatches(type: SuggestedActionType): boolean {
  return ['CREATE_TRANSFER', 'CREATE_DONATION', 'CREATE_DISPOSAL'].includes(type);
}
export function newExecutionItem(): ExecutionDraftItem {
  return { id: crypto.randomUUID(), referenceId: '', quantity: '', unitCost: '', originalPrice: '', promotionalPrice: '', quantityAvailable: '', priority: '' };
}
export function emptyExecutionDraft(): ExecutionDraft {
  return { supplierId: '', expectedDeliveryDate: '', destinationStoreId: '', institution: '', reason: '', name: '', description: '', promotionType: '', startsAt: '', endsAt: '', observation: '', items: [newExecutionItem()] };
}
function text(value: string, label: string, max: number, required = false): string {
  const clean = value.trim();
  if ((required && !clean) || clean.length > max) throw new Error(`${label}: ${required ? 'preencha o campo e use' : 'use'} até ${max} caracteres.`);
  return clean;
}
function decimal(value: string, label: string, places = 3, integerPlaces = 7, allowZero = false): number {
  const clean = value.trim().replace(',', '.');
  if (!new RegExp(`^\\d{1,${integerPlaces}}(\\.\\d{1,${places}})?$`).test(clean) || (allowZero ? Number(clean) < 0 : Number(clean) <= 0)) throw new Error(`${label}: informe um valor ${allowZero ? 'maior ou igual a' : 'maior que'} zero, com até ${integerPlaces} dígitos inteiros e ${places} casas decimais.`);
  return Number(clean);
}
function date(value: string, label: string, time = false): string {
  const pattern = time ? /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/ : /^\d{4}-\d{2}-\d{2}$/;
  const parsed = new Date(`${value}${time ? ':00' : 'T00:00:00'}Z`);
  if (!pattern.test(value) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, time ? 16 : 10) !== value) throw new Error(`${label}: informe uma data válida.`);
  return time ? `${value}:00` : value;
}

export function toExecutionPayload(action: ApiSuggestedAction, storeId: number, draft: ExecutionDraft, context: ExecutionContext): ExecutionPayload {
  if (!['PENDING', 'APPROVED'].includes(action.status)) throw new Error('A sugestão não está disponível para execução. Consulte o alerta novamente.');
  if (context.profile.storeId !== storeId) throw new Error('A loja do alerta deve ser a mesma loja do seu perfil para executar esta operação.');
  if (!draft.items.length) throw new Error('Inclua pelo menos um item.');
  const type = action.actionType;
  const seen = new Set<number>();
  const items = draft.items.map((item, position) => {
    const reference = requireInventoryId(item.referenceId);
    const label = `Item ${position + 1}`;
    if (usesExecutionBatches(type)) {
      const row = context.inventory.find((entry) => entry.id === reference && entry.storeId === storeId && entry.inventoryType === 'NORMAL' && entry.currentQuantity > 0);
      if (!row) throw new Error(`${label}: selecione um lote do estoque normal com saldo.`);
      if (seen.has(row.batchId)) throw new Error('Um lote não pode ser repetido.');
      seen.add(row.batchId);
      const quantity = decimal(item.quantity, `${label}, quantidade`);
      if (quantity > row.currentQuantity) throw new Error(`${label}: a quantidade supera o saldo consultado.`);
      return { batchId: row.batchId, quantity };
    }
    if (!context.products.some((product) => product.id === reference && product.active)) throw new Error(`${label}: selecione um produto ativo.`);
    if (seen.has(reference)) throw new Error('Um produto não pode ser repetido.');
    seen.add(reference);
    if (type === 'CREATE_PURCHASE_ORDER') return { productId: reference, requestedQuantity: decimal(item.quantity, `${label}, quantidade`, 3, 7), unitCost: decimal(item.unitCost, `${label}, custo unitário`, 2, 8) };
    if (type === 'CREATE_PROMOTION') {
      const originalPrice = decimal(item.originalPrice, `${label}, preço original`, 2, 10);
      const promotionalPrice = decimal(item.promotionalPrice, `${label}, preço promocional`, 2, 10);
      if (promotionalPrice > originalPrice) throw new Error(`${label}: o preço promocional não pode superar o original.`);
      return { productId: reference, originalPrice, promotionalPrice, ...(item.quantityAvailable.trim() ? { quantityAvailable: decimal(item.quantityAvailable, `${label}, quantidade disponível`, 3, 9, true) } : {}) };
    }
    if (type !== 'CREATE_REPLENISHMENT') throw new Error('Tipo de ação não suportado.');
    if (!['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(item.priority)) throw new Error(`${label}: selecione a prioridade.`);
    return { productId: reference, quantity: decimal(item.quantity, `${label}, quantidade`), priority: item.priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' };
  });
  if (type === 'CREATE_REPLENISHMENT') return { items };
  if (type === 'CREATE_PROMOTION') {
    if (!Object.prototype.hasOwnProperty.call(promotionTypeLabels, draft.promotionType)) throw new Error('Selecione um tipo de promoção válido.');
    const startsAt = date(draft.startsAt, 'Início', true);
    const endsAt = date(draft.endsAt, 'Fim', true);
    if (endsAt <= startsAt) throw new Error('O fim da promoção deve ser posterior ao início.');
    return { name: text(draft.name, 'Nome', 150, true), description: text(draft.description, 'Descrição', 2000), promotionType: text(draft.promotionType, 'Tipo de promoção', 20, true), startsAt, endsAt, items };
  }
  const observation = text(draft.observation, 'Observação', 2000);
  if (type === 'CREATE_PURCHASE_ORDER') {
    const supplierId = requireInventoryId(draft.supplierId);
    if (!context.suppliers.some((supplier) => Number(supplier.id) === supplierId && supplier.active)) throw new Error('Selecione um fornecedor ativo.');
    return { supplierId, ...(draft.expectedDeliveryDate ? { expectedDeliveryDate: date(draft.expectedDeliveryDate, 'Entrega prevista') } : {}), observation, items };
  }
  if (type === 'CREATE_TRANSFER') {
    const destinationStoreId = requireInventoryId(draft.destinationStoreId);
    if (destinationStoreId === storeId) throw new Error('O destino deve ser diferente da loja de origem.');
    if (context.storeListAvailable && !context.stores.some((store) => store.id === destinationStoreId && store.active)) throw new Error('Selecione uma loja de destino ativa.');
    return { destinationStoreId, observation, items };
  }
  if (type === 'CREATE_DONATION') return { institution: text(draft.institution, 'Instituição', 150, true), observation, items };
  if (type === 'CREATE_DISPOSAL') return { reason: text(draft.reason, 'Motivo', 100, true), observation, items };
  throw new Error('Tipo de ação não suportado.');
}
