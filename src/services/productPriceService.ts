import type { StoreProductPrice } from '@/types/product-operations.types';
import { operationalId } from '@/utils/operationalValidation';
import { productPrice } from '@/utils/productOperationsValidation';
import { apiRequest, serviceError } from './apiClient';

export async function getProductPrices(id: number, signal?: AbortSignal): Promise<StoreProductPrice[]> {
  try { return await apiRequest<StoreProductPrice[]>(`/products/${operationalId(id)}/store-prices`, { signal }); }
  catch (error) { throw serviceError(error, 'Não foi possível consultar os preços do produto.'); }
}

export async function updateProductPrice(id: number, storeId: number, price: string): Promise<StoreProductPrice> {
  try {
    return await apiRequest<StoreProductPrice>(`/products/${operationalId(id)}/store-prices/${operationalId(storeId)}`, { method: 'PUT', body: { newPrice: productPrice(price) } });
  } catch (error) { throw serviceError(error, 'Não foi possível alterar o preço do produto.'); }
}
