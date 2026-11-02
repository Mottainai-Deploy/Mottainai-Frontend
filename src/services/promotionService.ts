import type { CreatePromotionPayload, UpdatePromotionPayload, PromotionResponse } from '@/types/promotion-api.types';
import { apiRequest, serviceError } from './apiClient';
import { operationalId, promotionPayload, promotionUpdatePayload } from '@/utils/operationalValidation';

export async function getPromotions(storeId: number, signal?: AbortSignal): Promise<PromotionResponse[]> {
  try {
    return await apiRequest<PromotionResponse[]>(`/promotions?storeId=${operationalId(storeId)}`, { signal });
  } catch (error) {
    throw serviceError(error, 'Não foi possível concluir a operação.');
  }
}

export async function getPromotion(id: number, signal?: AbortSignal): Promise<PromotionResponse> {
  try {
    return await apiRequest<PromotionResponse>(`/promotions/${operationalId(id)}`, { signal });
  } catch (error) {
    throw serviceError(error, 'Não foi possível concluir a operação.');
  }
}

export async function createPromotion(payload: CreatePromotionPayload): Promise<PromotionResponse> {
  try {
    return await apiRequest<PromotionResponse>('/promotions', { method: 'POST', body: promotionPayload(payload) });
  } catch (error) {
    throw serviceError(error, 'Não foi possível concluir a operação.');
  }
}

export async function updatePromotion(id: number, payload: UpdatePromotionPayload): Promise<PromotionResponse> {
  try {
    return await apiRequest<PromotionResponse>(`/promotions/${operationalId(id)}`, { method: 'PUT', body: promotionUpdatePayload(payload) });
  } catch (error) {
    throw serviceError(error, 'Não foi possível concluir a operação.');
  }
}

export async function deletePromotion(id: number): Promise<void> {
  try {
    return await apiRequest<void>(`/promotions/${operationalId(id)}`, { method: 'DELETE' });
  } catch (error) {
    throw serviceError(error, 'Não foi possível concluir a operação.');
  }
}

export async function approvePromotion(id: number): Promise<PromotionResponse> {
  try {
    return await apiRequest<PromotionResponse>(`/promotions/${operationalId(id)}/approve`, { method: 'POST' });
  } catch (error) {
    throw serviceError(error, 'Não foi possível concluir a operação.');
  }
}

export async function rejectPromotion(id: number): Promise<PromotionResponse> {
  try {
    return await apiRequest<PromotionResponse>(`/promotions/${operationalId(id)}/reject`, { method: 'POST' });
  } catch (error) {
    throw serviceError(error, 'Não foi possível concluir a operação.');
  }
}

export async function cancelPromotion(id: number): Promise<PromotionResponse> {
  try {
    return await apiRequest<PromotionResponse>(`/promotions/${operationalId(id)}/status`, { method: 'PATCH' });
  } catch (error) {
    throw serviceError(error, 'Não foi possível concluir a operação.');
  }
}
