import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiRequestError } from '@/services/apiClient';
import { getCurrentProfile } from '@/services/profileService';
import { getProducts } from '@/services/productService';
import { approvePromotion, cancelPromotion, createPromotion, deletePromotion, getPromotion, getPromotions, rejectPromotion, updatePromotion } from '@/services/promotionService';
import { createPromotionItem, deletePromotionItem, getPromotionItems, updatePromotionItem } from '@/services/promotionItemService';
import { useApiQuery } from '@/hooks/useApiQuery';
import { createPromotionItemPayload, promotionPayload, promotionUpdatePayload } from '@/utils/operationalValidation';
import { requireInventoryId } from '@/utils/inventoryValidation';
import type { CatalogProduct } from '@/types/catalog-product.types';
import type { PromotionResponse, PromotionItemResponse, PromotionType } from '@/types/promotion-api.types';
import type { PendingPromotionWrite, PromotionDraft, PromotionItemDraft, PromotionOperationsState } from '@/types/promotion-operations.types';

interface PromotionData { storeId: number; products: CatalogProduct[]; promotions: PromotionResponse[]; }
type DetailState = { status: 'idle' | 'loading' | 'success' | 'error'; promotion: PromotionResponse | null; items: PromotionItemResponse[]; error: string };
const emptyPromotionDraft = (): PromotionDraft => ({ name: '', description: '', promotionType: '', startsAt: '', endsAt: '' });
const emptyItemDraft = (): PromotionItemDraft => ({ productId: '', originalPrice: '', promotionalPrice: '', quantityAvailable: '' });
function numeric(value: string, optional = false): number | null {
  if (optional && !value.trim()) return null;
  const parsed = Number(value.trim().replace(',', '.'));
  if (!Number.isFinite(parsed)) throw new Error('Informe um preço ou quantidade válido.');
  return parsed;
}

export function usePromotionOperations(trackedId: number | null) {
  const lock = useRef(false);
  const [state, setState] = useState<PromotionOperationsState>(() => ({ revision: 0, selectedId: trackedId, draft: emptyPromotionDraft(), itemDraft: emptyItemDraft(), editing: false, editingItemId: null, pending: null, reviewing: false, busy: false, uncertain: false, feedback: '', feedbackIsError: false, search: '' }));
  useEffect(() => { setState((current) => current.selectedId === trackedId ? current : ({ ...current, selectedId: trackedId, editing: false, editingItemId: null, reviewing: false })); }, [trackedId]);
  const load = useCallback(async (signal: AbortSignal): Promise<PromotionData> => {
    const profile = await getCurrentProfile(signal);
    const [products, promotions] = await Promise.all([getProducts(signal), getPromotions(profile.storeId, signal)]);
    return { storeId: profile.storeId, products, promotions };
  }, []);
  const query = useApiQuery(load, { storeId: 0, products: [], promotions: [] }, state.revision);
  const [detail, setDetail] = useState<DetailState>({ status: 'idle', promotion: null, items: [], error: '' });

  useEffect(() => {
    if (state.selectedId === null) { setDetail({ status: 'idle', promotion: null, items: [], error: '' }); return; }
    const controller = new AbortController();
    setDetail({ status: 'loading', promotion: null, items: [], error: '' });
    void Promise.all([getPromotion(state.selectedId, controller.signal), getPromotionItems(state.selectedId, controller.signal)])
      .then(([promotion, items]) => { if (!controller.signal.aborted) setDetail({ status: 'success', promotion, items, error: '' }); })
      .catch((error: unknown) => { if (!controller.signal.aborted) setDetail({ status: 'error', promotion: null, items: [], error: error instanceof Error ? error.message : 'Não foi possível consultar a promoção.' }); });
    return () => controller.abort();
  }, [state.selectedId, state.revision]);

  const promotions = query.data.promotions.filter((promotion) => !state.search.trim() || `${promotion.id} ${promotion.name} ${promotion.status}`.toLocaleLowerCase('pt-BR').includes(state.search.trim().toLocaleLowerCase('pt-BR')));
  function submitPromotion(): void {
    if (lock.current || state.busy || state.uncertain || query.status !== 'success') return;
    try {
      const base = { name: state.draft.name, description: state.draft.description || null, promotionType: state.draft.promotionType as PromotionType, startsAt: state.draft.startsAt, endsAt: state.draft.endsAt };
      const pending: PendingPromotionWrite = state.editing && state.selectedId !== null
        ? { kind: 'update', id: state.selectedId, payload: promotionUpdatePayload(base) }
        : { kind: 'create', payload: promotionPayload({ ...base, storeId: query.data.storeId }) };
      setState((current) => ({ ...current, pending, reviewing: true, feedback: '', feedbackIsError: false }));
    } catch (error) { setState((current) => ({ ...current, feedback: error instanceof Error ? error.message : 'Revise os dados da promoção.', feedbackIsError: true })); }
  }
  function submitItem(): void {
    if (lock.current || state.busy || state.uncertain || !detail.promotion || detail.promotion.status !== 'PENDING_APPROVAL') return;
    try {
      const fields = { originalPrice: numeric(state.itemDraft.originalPrice)!, promotionalPrice: numeric(state.itemDraft.promotionalPrice)!, quantityAvailable: numeric(state.itemDraft.quantityAvailable, true) };
      const pending: PendingPromotionWrite = state.editingItemId === null
        ? { kind: 'createItem', promotionId: detail.promotion.id, payload: createPromotionItemPayload({ ...fields, productId: requireInventoryId(state.itemDraft.productId) }) }
        : { kind: 'updateItem', promotionId: detail.promotion.id, id: state.editingItemId, payload: fields };
      setState((current) => ({ ...current, pending, reviewing: true, feedback: '', feedbackIsError: false }));
    } catch (error) { setState((current) => ({ ...current, feedback: error instanceof Error ? error.message : 'Revise os dados do item promocional.', feedbackIsError: true })); }
  }

  async function send(pending: PendingPromotionWrite): Promise<void> {
    if (lock.current) return;
    lock.current = true;
    setState((current) => ({ ...current, busy: true, feedback: 'Salvando promoção…', feedbackIsError: false }));
    try {
      let promotionId = pending.kind === 'create' ? null : pending.kind === 'update' ? pending.id : pending.promotionId;
      if (pending.kind === 'create') promotionId = (await createPromotion(pending.payload)).id;
      if (pending.kind === 'update') await updatePromotion(pending.id, pending.payload);
      if (pending.kind === 'createItem') await createPromotionItem(pending.promotionId, pending.payload);
      if (pending.kind === 'updateItem') await updatePromotionItem(pending.promotionId, pending.id, pending.payload);
      setState((current) => ({ ...current, busy: false, uncertain: false, pending: null, reviewing: false, selectedId: promotionId, editing: false, editingItemId: null, draft: emptyPromotionDraft(), itemDraft: emptyItemDraft(), revision: current.revision + 1, feedback: pending.kind === 'create' ? `Promoção ${promotionId} criada inativa e pendente de aprovação.` : 'Alteração confirmada pelo servidor.', feedbackIsError: false }));
    } catch (error) {
      const rejected = error instanceof ApiRequestError && error.status >= 400 && error.status < 500;
      setState((current) => ({ ...current, busy: false, uncertain: !rejected, pending: rejected ? null : pending, reviewing: !rejected, feedback: error instanceof Error ? error.message : 'Não foi possível confirmar a alteração.', feedbackIsError: true }));
    } finally { lock.current = false; }
  }
  async function verifyUnknownWrite(): Promise<void> {
    try {
      const profile = await getCurrentProfile();
      await getPromotions(profile.storeId);
      if (state.pending && state.pending.kind !== 'create') {
        const promotionId = state.pending.kind === 'update' ? state.pending.id : state.pending.promotionId;
        await Promise.all([getPromotion(promotionId), getPromotionItems(promotionId)]);
      }
      setState((current) => ({ ...current, pending: null, reviewing: false, uncertain: false, revision: current.revision + 1, feedback: 'Estado consultado no servidor. Confira a lista e os detalhes antes de enviar outra alteração.', feedbackIsError: false }));
    } catch (error) { setState((current) => ({ ...current, feedback: error instanceof Error ? error.message : 'Não foi possível consultar a promoção.', feedbackIsError: true })); }
  }
  async function runStatus(id: number, action: 'approve' | 'reject' | 'cancel' | 'delete'): Promise<void> {
    if (action === 'approve') await approvePromotion(id);
    if (action === 'reject') await rejectPromotion(id);
    if (action === 'cancel') await cancelPromotion(id);
    if (action === 'delete') await deletePromotion(id);
    setState((current) => ({ ...current, revision: current.revision + 1, selectedId: action === 'delete' ? null : id }));
  }
  async function verify(id: number): Promise<void> {
    await getPromotion(id);
    await getPromotionItems(id);
    setState((current) => ({ ...current, selectedId: id, revision: current.revision + 1 }));
  }
  async function verifyDeleted(id: number): Promise<void> {
    try { await getPromotion(id); throw new Error('A promoção continua disponível no servidor. Confira o estado antes de tentar novamente.'); }
    catch (error) {
      if (!(error instanceof ApiRequestError && error.status === 404)) throw error;
      setState((current) => ({ ...current, selectedId: null, revision: current.revision + 1 }));
    }
  }
  async function deleteItem(promotionId: number, itemId: number): Promise<void> {
    await deletePromotionItem(promotionId, itemId);
    setState((current) => ({ ...current, revision: current.revision + 1, selectedId: promotionId }));
  }

  return {
    state, query, detail, promotions,
    setSearch: (search: string) => setState((current) => ({ ...current, search })),
    select: (id: number | null) => setState((current) => ({ ...current, selectedId: id, editing: false, editingItemId: null, reviewing: false })),
    startCreate: () => setState((current) => ({ ...current, selectedId: null, editing: false, editingItemId: null, draft: emptyPromotionDraft(), reviewing: false, feedback: '', feedbackIsError: false, uncertain: false })),
    startEdit: (promotion: PromotionResponse) => setState((current) => ({ ...current, selectedId: promotion.id, editing: true, draft: { name: promotion.name, description: promotion.description ?? '', promotionType: promotion.promotionType, startsAt: promotion.startsAt.slice(0, 16), endsAt: promotion.endsAt.slice(0, 16) }, reviewing: false, feedback: '' })),
    edit: <K extends keyof PromotionDraft>(field: K, value: PromotionDraft[K]) => setState((current) => ({ ...current, draft: { ...current.draft, [field]: value }, feedback: '' })),
    submitPromotion,
    startEditItem: (item: PromotionItemResponse) => setState((current) => ({ ...current, editingItemId: item.id, itemDraft: { productId: String(item.productId), originalPrice: String(item.originalPrice), promotionalPrice: String(item.promotionalPrice), quantityAvailable: item.quantityAvailable == null ? '' : String(item.quantityAvailable) }, reviewing: false })),
    startAddItem: () => setState((current) => ({ ...current, editingItemId: null, itemDraft: emptyItemDraft(), reviewing: false })),
    editItem: <K extends keyof PromotionItemDraft>(field: K, value: PromotionItemDraft[K]) => setState((current) => ({ ...current, itemDraft: { ...current.itemDraft, [field]: value }, feedback: '' })),
    submitItem,
    cancelReview: () => setState((current) => ({ ...current, pending: null, reviewing: false })),
    confirm: () => { if (state.pending) void send(state.pending); },
    verifyUnknownWrite,
    runStatus, verify, verifyDeleted, deleteItem,
    refresh: () => setState((current) => ({ ...current, revision: current.revision + 1 })),
    setBusy: (busy: boolean) => setState((current) => ({ ...current, busy })),
    setUncertain: (uncertain: boolean) => setState((current) => ({ ...current, uncertain })),
  };
}
