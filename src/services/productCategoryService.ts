import type { ProductCategoryResponse } from '@/types/product-category-api.types';
import { apiPages, serviceError } from './apiClient';

export async function getProductCategories(signal?: AbortSignal): Promise<ProductCategoryResponse[]> {
  try {
    return await apiPages<ProductCategoryResponse>('/product-categories', signal);
  } catch (error) { throw serviceError(error, 'Não foi possível consultar as categorias.'); }
}
