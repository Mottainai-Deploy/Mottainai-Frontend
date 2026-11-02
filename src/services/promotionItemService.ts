import type { CreatePromotionItemPayload, PromotionItemFields, PromotionItemResponse } from '@/types/promotion-api.types';
import { apiRequest, serviceError } from './apiClient';
import { operationalId, createPromotionItemPayload, promotionItemPayload } from '@/utils/operationalValidation';

export async function getPromotionItems(promotionId: number, signal?: AbortSignal): Promise<PromotionItemResponse[]> {
  try {
    return await apiRequest<PromotionItemResponse[]>(`/promotions/${operationalId(promotionId)}/items`, { signal });
  } catch (error) {
    throw serviceError(error, 'Não foi possível concluir a operação.');
  }
}

export async function createPromotionItem(promotionId: number, payload: CreatePromotionItemPayload): Promise<PromotionItemResponse> {
  try {
    return await apiRequest<PromotionItemResponse>(`/promotions/${operationalId(promotionId)}/items`, { method: 'POST', body: createPromotionItemPayload(payload) });
  } catch (error) {
    throw serviceError(error, 'Não foi possível concluir a operação.');
  }
}

export async function updatePromotionItem(promotionId: number, id: number, payload: PromotionItemFields): Promise<PromotionItemResponse> {
  try {
    return await apiRequest<PromotionItemResponse>(`/promotions/${operationalId(promotionId)}/items/${operationalId(id)}`, { method: 'PUT', body: promotionItemPayload(payload) });
  } catch (error) {
    throw serviceError(error, 'Não foi possível concluir a operação.');
  }
}

export async function deletePromotionItem(promotionId: number, id: number): Promise<void> {
  try {
    return await apiRequest<void>(`/promotions/${operationalId(promotionId)}/items/${operationalId(id)}`, { method: 'DELETE' });
  } catch (error) {
    throw serviceError(error, 'Não foi possível concluir a operação.');
  }
}
