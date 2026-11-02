import { useCallback, useRef, useState } from 'react';
import type { ProductOperationsContext, ProductOperationsProps, ProductOperationsState } from '@/types/product-operations.types';
import { getCurrentProfile } from '@/services/profileService';
import { getProductPrices, updateProductPrice } from '@/services/productPriceService';
import { updateProductStatus, getProduct, deleteProduct } from '@/services/productService';
import { ApiRequestError } from '@/services/apiClient';
import { productPrice } from '@/utils/productOperationsValidation';
import { useApiQuery } from './useApiQuery';

export function useProductOperations({ product, onChanged, onDeleted }: ProductOperationsProps) {
  const [state, setState] = useState<ProductOperationsState>({ price: '', action: null, stage: 'idle', message: '', revision: 0 });
  const lock = useRef(false);
  const load = useCallback(async (signal: AbortSignal): Promise<ProductOperationsContext> => {
    const [profile, prices] = await Promise.all([getCurrentProfile(signal), getProductPrices(product.id, signal)]);
    return { profile, prices };
  }, [product.id]);
  const query = useApiQuery<ProductOperationsContext | null>(load, null, state.revision);
  const blocked = state.stage === 'saving' || state.stage === 'uncertain';

  function review(action: 'price' | 'status' | 'delete'): void {
    if (blocked || (action === 'price' && (query.status !== 'success' || !query.data))) return;
    try {
      if (action === 'price') productPrice(state.price);
      setState(previous => ({ ...previous, action, stage: 'review', message: '' }));
    } catch (error) {
      setState(previous => ({ ...previous, action: null, stage: 'error', message: error instanceof Error ? error.message : 'Revise os dados.' }));
    }
  }
  async function confirm(): Promise<void> {
    if (lock.current || state.stage !== 'review' || !state.action || (state.action === 'price' && !query.data)) return;
    lock.current = true;
    setState(previous => ({ ...previous, stage: 'saving', message: 'Salvando alteração…' }));
    try {
      if (state.action === 'price') {
        const storeId = query.data!.profile.storeId;
        const saved = await updateProductPrice(product.id, storeId, state.price);
        if (saved.productId !== product.id || saved.storeId !== storeId || saved.regularPrice !== productPrice(state.price)) throw new Error('A resposta não confirmou o preço desta loja.');
      } else if (state.action === 'delete') {
        await deleteProduct(product.id);
        onDeleted();
        return;
      } else {
        const saved = await updateProductStatus(product.id, !product.active);
        if (saved.id !== product.id || saved.active !== !product.active) throw new Error('A resposta não confirmou o status solicitado.');
      }
      onChanged(state.action === 'price' ? 'Preço da loja atualizado pelo servidor.' : 'Status do produto atualizado pelo servidor.');
    } catch (error) {
      const rejected = error instanceof ApiRequestError && error.status >= 400 && error.status < 500;
      setState(previous => ({ ...previous, stage: rejected ? 'error' : 'uncertain', action: null,
        message: error instanceof Error ? error.message : 'Não foi possível confirmar a alteração.' }));
    } finally { lock.current = false; }
  }
  async function check(): Promise<void> {
    if (lock.current) return;
    lock.current = true;
    setState(previous => ({ ...previous, stage: 'saving', message: 'Consultando o estado atual…' }));
    try {
      try { await getProduct(String(product.id)); }
      catch (error) { if (error instanceof ApiRequestError && error.status === 404) { onDeleted(); return; } throw error; }
      await getProductPrices(product.id);
      onChanged('Dados consultados novamente. Confira o estado atual antes de outra alteração.');
    } catch (error) {
      setState(previous => ({ ...previous, stage: 'uncertain', message: error instanceof Error ? error.message : 'Consulta indisponível.' }));
    } finally { lock.current = false; }
  }
  return { state, query, blocked, review, confirm, check,
    changePrice: (price: string) => { if (!blocked) setState(previous => ({ ...previous, price, stage: 'idle', action: null, message: '' })); },
    cancel: () => { if (!blocked) setState(previous => ({ ...previous, stage: 'idle', action: null, message: '' })); } };
}
