import type { OperationalQuery } from '@/types/operational-query.types';
import type { CreatePurchaseOrderPayload, UpdatePurchaseOrderPayload } from '@/types/purchase-order-api.types';
import type { CreateReceivingPayload } from '@/types/receiving-api.types';
import type { CreateDonationPayload } from '@/types/donation-api.types';
import type { CreateReplenishmentExecutionPayload } from '@/types/replenishment-api.types';
import type { CreatePromotionPayload, UpdatePromotionPayload, PromotionItemFields, CreatePromotionItemPayload, PromotionType } from '@/types/promotion-api.types';
import { requireInventoryId } from './inventoryValidation';

export function operationalId(value: number): number {
  const id = requireInventoryId(String(value));
  if (id > 2147483647) throw new Error('O identificador ultrapassa o limite aceito pela API.');
  return id;
}
export function operationalText(value: string | null | undefined, max: number, required = false): string | null {
  if (value == null && !required) return null;
  if (typeof value !== 'string' || (required && !value.trim()) || value.trim().length > max) throw new Error(`Informe um texto válido com até ${max} caracteres.`);
  return value.trim();
}
export function operationalDecimal(value: number, minimum: number, places = 3, integerPlaces = 7): number {
  if (!Number.isFinite(value) || value < minimum || value >= 10 ** integerPlaces || !new RegExp(`^\\d+(\\.\\d{1,${places}})?$`).test(String(value))) throw new Error(`Informe um número a partir de ${minimum}, com até ${integerPlaces} dígitos inteiros e ${places} casas decimais.`);
  return value;
}
export function operationalDate(value: string, time = false): string {
  const pattern = time ? /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/ : /^\d{4}-\d{2}-\d{2}$/;
  const normalized = time && value.length === 16 ? `${value}:00` : value;
  const parsed = new Date(`${normalized}${time ? '' : 'T00:00:00'}Z`);
  if (!pattern.test(value) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, time ? 19 : 10) !== normalized) throw new Error('Informe uma data válida, sem fuso horário.');
  return normalized;
}
export function operationalQuery(query: OperationalQuery): string {
  const from = operationalDate(query.from, true);
  const to = operationalDate(query.to, true);
  const limit = new Date(`${from}Z`);
  const day = limit.getUTCDate();
  limit.setUTCDate(1);
  limit.setUTCMonth(limit.getUTCMonth() + 6);
  const lastDay = new Date(Date.UTC(limit.getUTCFullYear(), limit.getUTCMonth() + 1, 0)).getUTCDate();
  limit.setUTCDate(Math.min(day, lastDay));
  if (to < from || new Date(`${to}Z`) > limit) throw new Error('Selecione um período ordenado de até seis meses.');
  return new URLSearchParams({ storeId: String(operationalId(query.storeId)), from, to }).toString();
}
export function operationalStatus<T extends string>(value: T, allowed: readonly T[]): T {
  if (!allowed.includes(value)) throw new Error('Selecione um status permitido para esta operação.');
  return value;
}
function uniqueItems<T>(items: T[], id: (item: T) => number): void {
  if (!Array.isArray(items) || !items.length) throw new Error('Inclua pelo menos um item.');
  const ids = items.map(item => operationalId(id(item)));
  if (new Set(ids).size !== ids.length) throw new Error('Os itens não podem ser repetidos.');
}
function purchaseItems(items: CreatePurchaseOrderPayload['items']): CreatePurchaseOrderPayload['items'] {
  uniqueItems(items, item => item.productId);
  return items.map(item => ({ productId: operationalId(item.productId), requestedQuantity: operationalDecimal(item.requestedQuantity, 0.001), unitCost: operationalDecimal(item.unitCost, 0.01, 2, 8) }));
}
export function purchasePayload(value: CreatePurchaseOrderPayload): CreatePurchaseOrderPayload {
  return { supplierId: operationalId(value.supplierId), expectedDeliveryDate: value.expectedDeliveryDate == null ? null : operationalDate(value.expectedDeliveryDate), observation: operationalText(value.observation, 2000), items: purchaseItems(value.items) };
}
export function purchaseUpdatePayload(value: UpdatePurchaseOrderPayload): UpdatePurchaseOrderPayload {
  if (!Number.isSafeInteger(value.version) || value.version < 0) throw new Error('Consulte a versão atual do pedido antes de editar.');
  return { version: value.version, supplierId: value.supplierId == null ? null : operationalId(value.supplierId), expectedDeliveryDate: value.expectedDeliveryDate == null ? null : operationalDate(value.expectedDeliveryDate), observation: operationalText(value.observation, 2000), items: purchaseItems(value.items) };
}
export function receivingPayload(value: CreateReceivingPayload): CreateReceivingPayload {
  uniqueItems(value.items, item => item.purchaseOrderItemId);
  return { purchaseOrderId: operationalId(value.purchaseOrderId), observation: operationalText(value.observation, 2000), items: value.items.map(item => {
    const expirationDate = operationalDate(item.expirationDate);
    const manufactureDate = item.manufactureDate == null ? null : operationalDate(item.manufactureDate);
    if (manufactureDate && manufactureDate > expirationDate) throw new Error('A fabricação não pode ocorrer depois do vencimento.');
    return { purchaseOrderItemId: operationalId(item.purchaseOrderItemId), receivedQuantity: operationalDecimal(item.receivedQuantity, 0.001), unitCost: operationalDecimal(item.unitCost, 0, 2, 8), manufactureDate, expirationDate, observation: operationalText(item.observation, Number.MAX_SAFE_INTEGER) };
  }) };
}
export function donationPayload(value: CreateDonationPayload): CreateDonationPayload {
  uniqueItems(value.items, item => item.batchId);
  return { institution: operationalText(value.institution, 150, true)!, suggestedActionId: value.suggestedActionId == null ? null : operationalId(value.suggestedActionId), observation: operationalText(value.observation, Number.MAX_SAFE_INTEGER), items: value.items.map(item => ({ batchId: operationalId(item.batchId), donatedQuantity: operationalDecimal(item.donatedQuantity, 0.001) })) };
}
export function replenishmentPayload(value: CreateReplenishmentExecutionPayload): CreateReplenishmentExecutionPayload {
  uniqueItems(value.items, item => item.batchId);
  if (value.rating != null && (!Number.isInteger(value.rating) || value.rating < 1 || value.rating > 5)) throw new Error('A avaliação deve ser um inteiro de 1 a 5.');
  return { preListId: operationalId(value.preListId), rating: value.rating ?? null, comment: operationalText(value.comment, Number.MAX_SAFE_INTEGER), items: value.items.map(item => ({ batchId: operationalId(item.batchId), replenishedQuantity: operationalDecimal(item.replenishedQuantity, 0.001) })) };
}
export function promotionUpdatePayload(value: UpdatePromotionPayload): UpdatePromotionPayload {
  const result: UpdatePromotionPayload = {};
  if (value.name !== undefined) result.name = operationalText(value.name, 150, true)!;
  if (value.description !== undefined) result.description = operationalText(value.description, Number.MAX_SAFE_INTEGER);
  if (value.promotionType !== undefined) result.promotionType = operationalStatus<PromotionType>(value.promotionType, ['DISCOUNT_PERCENT', 'DISCOUNT_FIXED', 'SPECIAL_PRICE']);
  if (value.startsAt !== undefined) result.startsAt = operationalDate(value.startsAt, true);
  if (value.endsAt !== undefined) result.endsAt = operationalDate(value.endsAt, true);
  if (result.startsAt && result.endsAt && result.endsAt <= result.startsAt) throw new Error('O fim deve ser posterior ao início.');
  if (value.active != null) { if (typeof value.active !== 'boolean') throw new Error('Informe um estado de ativação válido.'); result.active = value.active; }
  if (!Object.keys(result).length) throw new Error('Informe os campos para atualizar.');
  return result;
}
export function promotionPayload(value: CreatePromotionPayload): CreatePromotionPayload {
  const clean = promotionUpdatePayload(value);
  return { storeId: operationalId(value.storeId), name: operationalText(value.name, 150, true)!, description: clean.description, promotionType: operationalStatus(value.promotionType, ['DISCOUNT_PERCENT', 'DISCOUNT_FIXED', 'SPECIAL_PRICE']), startsAt: operationalDate(value.startsAt, true), endsAt: operationalDate(value.endsAt, true), active: clean.active };
}
export function promotionItemPayload(value: PromotionItemFields): PromotionItemFields {
  const originalPrice = operationalDecimal(value.originalPrice, 0, 2, 10);
  const promotionalPrice = operationalDecimal(value.promotionalPrice, 0, 2, 10);
  if (promotionalPrice > originalPrice) throw new Error('O preço promocional não pode superar o original.');
  return { originalPrice, promotionalPrice, quantityAvailable: value.quantityAvailable == null ? null : operationalDecimal(value.quantityAvailable, 0, 3, 9) };
}
export function createPromotionItemPayload(value: CreatePromotionItemPayload): CreatePromotionItemPayload {
  return { productId: operationalId(value.productId), ...promotionItemPayload(value) };
}
