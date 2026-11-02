import type { CatalogProduct, CatalogProductForm } from '@/types/catalog-product.types';
import { toCatalogProductPayload } from '@/utils/catalogProductValidation';
import { apiPages, apiRequest, serviceError } from './apiClient';
import { operationalId } from '@/utils/operationalValidation';
import { productActive } from '@/utils/productOperationsValidation';

export async function getProducts(signal?: AbortSignal): Promise<CatalogProduct[]> {
  try {
    return await apiPages<CatalogProduct>('/products', signal);
  } catch (error) { throw serviceError(error, 'Não foi possível consultar os produtos.'); }
}

export async function getProduct(id: string, signal?: AbortSignal): Promise<CatalogProduct> {
  try {
    if (!/^[1-9]\d*$/.test(id)) throw new Error('O identificador do produto é inválido.');
    return await apiRequest<CatalogProduct>(`/products/${id}`, { signal });
  } catch (error) { throw serviceError(error, 'Não foi possível consultar o produto.'); }
}

export async function createProduct(form: CatalogProductForm): Promise<CatalogProduct> {
  try {
    const body = toCatalogProductPayload(form);
    return await apiRequest<CatalogProduct>('/products', { method: 'POST', body });
  } catch (error) { throw serviceError(error, 'Não foi possível cadastrar o produto.'); }
}

export async function updateProductStatus(id: number, active: boolean): Promise<CatalogProduct> {
  try {
    return await apiRequest<CatalogProduct>(`/products/${operationalId(id)}/status`, { method: 'PATCH', body: { active: productActive(active) } });
  } catch (error) { throw serviceError(error, 'Não foi possível alterar o status do produto.'); }
}

export async function deleteProduct(id: number): Promise<void> {
  try { return await apiRequest<void>(`/products/${operationalId(id)}`, { method: 'DELETE' }); }
  catch (error) { throw serviceError(error, 'Não foi possível excluir o produto.'); }
}
