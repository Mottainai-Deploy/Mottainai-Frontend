import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiRequestError } from '@/services/apiClient';
import { getCurrentProfile } from '@/services/profileService';
import { getProducts } from '@/services/productService';
import { getSuppliers } from '@/services/supplierService';
import { createPurchaseOrder, deletePurchaseOrder, getPurchaseOrder, getPurchaseOrders, updatePurchaseOrder, updatePurchaseOrderStatus } from '@/services/purchaseOrderService';
import { createReceiving, getReceiving, getReceivings, updateReceivingStatus } from '@/services/receivingService';
import { useApiQuery } from '@/hooks/useApiQuery';
import { currentMonthRange, operationDateParams, operationalQueryForRange } from '@/utils/operationDateRange';
import { purchasePayload, purchaseUpdatePayload, receivingPayload } from '@/utils/operationalValidation';
import { requireInventoryId } from '@/utils/inventoryValidation';
import type { CatalogProduct } from '@/types/catalog-product.types';
import type { SupplierRecord } from '@/types/supplier.types';
import type { PurchaseOrderResponse, PurchaseOrderStatus, CreatePurchaseOrderPayload, UpdatePurchaseOrderPayload } from '@/types/purchase-order-api.types';
import type { ReceivingResponse, ReceivingStatus, CreateReceivingPayload } from '@/types/receiving-api.types';
import type { OperationDateRange } from '@/types/stock-disposal.types';
import type { PendingPurchaseWrite, PendingReceivingWrite, PurchaseOperationsState, PurchaseOrderDraft, PurchaseOrderDraftItem, ReceivingDraft, ReceivingDraftItem } from '@/types/purchase-operations.types';

interface PurchaseOperationsData {
  storeId: number;
  suppliers: SupplierRecord[];
  products: CatalogProduct[];
  orders: PurchaseOrderResponse[];
  receivings: ReceivingResponse[];
}

type DetailState<T> = { status: 'idle' | 'loading' | 'success' | 'error'; data: T | null; error: string };

const newOrderItem = (): PurchaseOrderDraftItem => ({ id: crypto.randomUUID(), productId: '', requestedQuantity: '', unitCost: '' });
const newReceivingItem = (): ReceivingDraftItem => ({ id: crypto.randomUUID(), purchaseOrderItemId: '', receivedQuantity: '', unitCost: '', manufactureDate: '', expirationDate: '', observation: '' });
const emptyOrderDraft = (): PurchaseOrderDraft => ({ supplierId: '', expectedDeliveryDate: '', observation: '', items: [newOrderItem()] });
const emptyReceivingDraft = (): ReceivingDraft => ({ observation: '', items: [newReceivingItem()] });

function decimal(value: string): number {
  const normalized = value.trim().replace(',', '.');
  if (!normalized) throw new Error('Preencha todas as quantidades e custos.');
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) throw new Error('Informe uma quantidade ou custo válido.');
  return parsed;
}

function makeOrderPayload(draft: PurchaseOrderDraft): CreatePurchaseOrderPayload {
  return {
    supplierId: requireInventoryId(draft.supplierId),
    expectedDeliveryDate: draft.expectedDeliveryDate || null,
    observation: draft.observation,
    items: draft.items.map((item) => ({ productId: requireInventoryId(item.productId), requestedQuantity: decimal(item.requestedQuantity), unitCost: decimal(item.unitCost) })),
  };
}

export function usePurchaseOperations(trackedOrderId: number | null) {
  const lock = useRef(false);
  const initialRange = currentMonthRange();
  const [state, setState] = useState<PurchaseOperationsState>(() => ({
    range: initialRange, appliedRange: initialRange, revision: 0, search: '',
    selectedOrderId: trackedOrderId, selectedReceivingId: null,
    orderDraft: emptyOrderDraft(), editingOrderId: null, receivingDraft: emptyReceivingDraft(), receivingFormOpen: false,
    pendingOrderWrite: null, pendingReceivingWrite: null, reviewing: null,
    busy: false, uncertain: false, feedback: '', feedbackIsError: false,
  }));
  useEffect(() => { setState((current) => current.selectedOrderId === trackedOrderId ? current : ({ ...current, selectedOrderId: trackedOrderId, selectedReceivingId: null })); }, [trackedOrderId]);
  const load = useCallback(async (signal: AbortSignal): Promise<PurchaseOperationsData> => {
    const profile = await getCurrentProfile(signal);
    const query = operationalQueryForRange(profile.storeId, state.appliedRange);
    const [suppliers, products, orders, receivings] = await Promise.all([
      getSuppliers(signal), getProducts(signal), getPurchaseOrders(query, signal), getReceivings(query, signal),
    ]);
    return { storeId: profile.storeId, suppliers, products, orders, receivings };
  }, [state.appliedRange]);
  const query = useApiQuery(load, { storeId: 0, suppliers: [], products: [], orders: [], receivings: [] }, state.revision);
  const [orderDetail, setOrderDetail] = useState<DetailState<PurchaseOrderResponse>>({ status: 'idle', data: null, error: '' });
  const [receivingDetail, setReceivingDetail] = useState<DetailState<ReceivingResponse>>({ status: 'idle', data: null, error: '' });

  useEffect(() => {
    const id = state.selectedOrderId;
    if (id === null) { setOrderDetail({ status: 'idle', data: null, error: '' }); return; }
    const controller = new AbortController();
    setOrderDetail({ status: 'loading', data: null, error: '' });
    void getPurchaseOrder(id, controller.signal).then((data) => {
      if (!controller.signal.aborted) setOrderDetail({ status: 'success', data, error: '' });
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setOrderDetail({ status: 'error', data: null, error: error instanceof Error ? error.message : 'Não foi possível consultar o pedido.' });
    });
    return () => controller.abort();
  }, [state.selectedOrderId, state.revision]);

  useEffect(() => {
    const id = state.selectedReceivingId;
    if (id === null) { setReceivingDetail({ status: 'idle', data: null, error: '' }); return; }
    const controller = new AbortController();
    setReceivingDetail({ status: 'loading', data: null, error: '' });
    void getReceiving(id, controller.signal).then((data) => {
      if (!controller.signal.aborted) setReceivingDetail({ status: 'success', data, error: '' });
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setReceivingDetail({ status: 'error', data: null, error: error instanceof Error ? error.message : 'Não foi possível consultar o recebimento.' });
    });
    return () => controller.abort();
  }, [state.selectedReceivingId, state.revision]);

  const filteredOrders = query.data.orders.filter((order) => !state.search.trim() || `${order.id} ${order.supplierId} ${order.status}`.toLocaleLowerCase('pt-BR').includes(state.search.trim().toLocaleLowerCase('pt-BR')));
  const filteredReceivings = query.data.receivings.filter((receiving) => !state.search.trim() || `${receiving.id} ${receiving.purchaseOrderId} ${receiving.status}`.toLocaleLowerCase('pt-BR').includes(state.search.trim().toLocaleLowerCase('pt-BR')));
  const editItem = <K extends keyof Omit<PurchaseOrderDraftItem, 'id'>>(id: string, field: K, value: PurchaseOrderDraftItem[K]) => setState((current) => ({ ...current, orderDraft: { ...current.orderDraft, items: current.orderDraft.items.map((item) => item.id === id ? { ...item, [field]: value } : item) }, feedback: '' }));
  const editReceivingItem = <K extends keyof Omit<ReceivingDraftItem, 'id'>>(id: string, field: K, value: ReceivingDraftItem[K]) => setState((current) => ({ ...current, receivingDraft: { ...current.receivingDraft, items: current.receivingDraft.items.map((item) => item.id === id ? { ...item, [field]: value } : item) }, feedback: '' }));

  function submitOrder(): void {
    if (lock.current || state.busy || state.uncertain) return;
    try {
      const base = makeOrderPayload(state.orderDraft);
      const pending: PendingPurchaseWrite = state.editingOrderId === null
        ? { kind: 'create', payload: purchasePayload(base), key: crypto.randomUUID() }
        : (() => {
          if (orderDetail.status !== 'success' || orderDetail.data?.id !== state.editingOrderId) throw new Error('Consulte o pedido novamente antes de editar.');
          const update: UpdatePurchaseOrderPayload = { ...base, version: orderDetail.data.version };
          return { kind: 'update', id: state.editingOrderId, payload: purchaseUpdatePayload(update) };
        })();
      setState((current) => ({ ...current, pendingOrderWrite: pending, reviewing: 'order', feedback: '', feedbackIsError: false }));
    } catch (error) { setState((current) => ({ ...current, feedback: error instanceof Error ? error.message : 'Revise os dados do pedido.', feedbackIsError: true })); }
  }

  async function sendOrder(pending: PendingPurchaseWrite): Promise<void> {
    if (lock.current) return;
    lock.current = true;
    setState((current) => ({ ...current, busy: true, feedback: 'Enviando pedido ao servidor…', feedbackIsError: false }));
    try {
      const result = pending.kind === 'create'
        ? await createPurchaseOrder(pending.payload, pending.key)
        : await updatePurchaseOrder(pending.id, pending.payload);
      setState((current) => ({ ...current, busy: false, uncertain: false, pendingOrderWrite: null, reviewing: null, editingOrderId: null, orderDraft: emptyOrderDraft(), selectedOrderId: result.id, revision: current.revision + 1, feedback: `Pedido ${result.id} confirmado pelo servidor. A criação não altera o estoque.`, feedbackIsError: false }));
    } catch (error) {
      const rejected = error instanceof ApiRequestError && error.status >= 400 && error.status < 500;
      const conflict = pending.kind === 'update' && error instanceof ApiRequestError && error.status === 409;
      setState((current) => ({ ...current, busy: false, pendingOrderWrite: rejected ? null : pending, reviewing: rejected && !conflict ? null : conflict ? null : 'order', editingOrderId: conflict ? null : current.editingOrderId, uncertain: !rejected, revision: conflict ? current.revision + 1 : current.revision, feedback: error instanceof Error ? error.message : 'Não foi possível confirmar o pedido.', feedbackIsError: true }));
    } finally { lock.current = false; }
  }

  function beginReceiving(order: PurchaseOrderResponse): void {
    if (state.busy || state.uncertain || order.status !== 'APPROVED') return;
    setState((current) => ({ ...current, selectedOrderId: order.id, selectedReceivingId: null, receivingDraft: { observation: '', items: order.items.map((item) => ({ id: crypto.randomUUID(), purchaseOrderItemId: String(item.id), receivedQuantity: '', unitCost: String(item.unitCost), manufactureDate: '', expirationDate: '', observation: '' })) }, receivingFormOpen: true, reviewing: null, feedback: '', feedbackIsError: false }));
  }

  function submitReceiving(): void {
    if (lock.current || state.busy || state.uncertain || orderDetail.status !== 'success' || orderDetail.data?.status !== 'APPROVED') return;
    try {
      const payload: CreateReceivingPayload = receivingPayload({
        purchaseOrderId: orderDetail.data.id, observation: state.receivingDraft.observation,
        items: state.receivingDraft.items.map((item) => ({ purchaseOrderItemId: requireInventoryId(item.purchaseOrderItemId), receivedQuantity: decimal(item.receivedQuantity), unitCost: decimal(item.unitCost), manufactureDate: item.manufactureDate || null, expirationDate: item.expirationDate, observation: item.observation })),
      });
      setState((current) => ({ ...current, pendingReceivingWrite: { payload, key: crypto.randomUUID() }, reviewing: 'receiving', feedback: '', feedbackIsError: false }));
    } catch (error) { setState((current) => ({ ...current, feedback: error instanceof Error ? error.message : 'Revise os dados do recebimento.', feedbackIsError: true })); }
  }

  async function sendReceiving(pending: PendingReceivingWrite): Promise<void> {
    if (lock.current) return;
    lock.current = true;
    setState((current) => ({ ...current, busy: true, feedback: 'Registrando recebimento…', feedbackIsError: false }));
    try {
      const result = await createReceiving(pending.payload, pending.key);
      setState((current) => ({ ...current, busy: false, uncertain: false, pendingReceivingWrite: null, reviewing: null, receivingFormOpen: false, receivingDraft: emptyReceivingDraft(), selectedReceivingId: result.id, revision: current.revision + 1, feedback: `Recebimento ${result.id} registrado. A entrada só ocorrerá após confirmação.`, feedbackIsError: false }));
    } catch (error) {
      const rejected = error instanceof ApiRequestError && error.status >= 400 && error.status < 500;
      setState((current) => ({ ...current, busy: false, pendingReceivingWrite: rejected ? null : pending, reviewing: rejected ? null : 'receiving', uncertain: !rejected, feedback: error instanceof Error ? error.message : 'Não foi possível confirmar o recebimento.', feedbackIsError: true }));
    } finally { lock.current = false; }
  }

  async function changeOrderStatus(id: number, status: Exclude<PurchaseOrderStatus, 'PENDING'>): Promise<void> {
    await updatePurchaseOrderStatus(id, status);
    setState((current) => ({ ...current, revision: current.revision + 1, selectedOrderId: id }));
  }
  async function verifyOrder(id: number): Promise<void> {
    const data = await getPurchaseOrder(id);
    setOrderDetail({ status: 'success', data, error: '' });
    setState((current) => ({ ...current, selectedOrderId: id, revision: current.revision + 1 }));
  }
  async function deleteOrder(id: number): Promise<void> {
    await deletePurchaseOrder(id);
    setState((current) => ({ ...current, selectedOrderId: current.selectedOrderId === id ? null : current.selectedOrderId, revision: current.revision + 1 }));
  }
  async function verifyOrderDeletion(id: number): Promise<void> {
    try { await getPurchaseOrder(id); throw new Error('O pedido ainda consta no servidor. Confira o estado antes de tentar novamente.'); }
    catch (error) {
      if (!(error instanceof ApiRequestError && error.status === 404)) throw error;
      setState((current) => ({ ...current, selectedOrderId: current.selectedOrderId === id ? null : current.selectedOrderId, revision: current.revision + 1 }));
    }
  }
  async function changeReceivingStatus(id: number, status: Exclude<ReceivingStatus, 'PENDING'>): Promise<void> {
    await updateReceivingStatus(id, status);
    setState((current) => ({ ...current, revision: current.revision + 1, selectedReceivingId: id }));
  }
  async function verifyReceiving(id: number): Promise<void> {
    const data = await getReceiving(id);
    setReceivingDetail({ status: 'success', data, error: '' });
    setState((current) => ({ ...current, selectedReceivingId: id, revision: current.revision + 1 }));
  }

  return {
    state, query, orderDetail, receivingDetail, filteredOrders, filteredReceivings,
    setSearch: (search: string) => setState((current) => ({ ...current, search })),
    changeRange: (field: keyof OperationDateRange, value: string) => setState((current) => ({ ...current, range: { ...current.range, [field]: value } })),
    applyRange: () => {
      try { operationDateParams(state.range); setState((current) => ({ ...current, appliedRange: { ...current.range }, feedback: '', feedbackIsError: false })); }
      catch (error) { setState((current) => ({ ...current, feedback: error instanceof Error ? error.message : 'Informe um período válido.', feedbackIsError: true })); }
    },
    refresh: () => setState((current) => ({ ...current, revision: current.revision + 1 })),
    selectOrder: (id: number | null) => setState((current) => ({ ...current, selectedOrderId: id, selectedReceivingId: null, receivingFormOpen: false, reviewing: null, feedback: '' })),
    selectReceiving: (id: number | null) => setState((current) => ({ ...current, selectedReceivingId: id, receivingFormOpen: false, reviewing: null, feedback: '' })),
    startCreateOrder: () => setState((current) => ({ ...current, editingOrderId: null, orderDraft: emptyOrderDraft(), receivingFormOpen: false, reviewing: null, feedback: '', feedbackIsError: false, uncertain: false, selectedOrderId: null, selectedReceivingId: null })),
    editOrderDraft: <K extends keyof Omit<PurchaseOrderDraft, 'items'>>(field: K, value: PurchaseOrderDraft[K]) => setState((current) => ({ ...current, orderDraft: { ...current.orderDraft, [field]: value }, feedback: '' })),
    editOrderItem: editItem,
    addOrderItem: () => setState((current) => ({ ...current, orderDraft: { ...current.orderDraft, items: [...current.orderDraft.items, newOrderItem()] } })),
    removeOrderItem: (id: string) => setState((current) => ({ ...current, orderDraft: { ...current.orderDraft, items: current.orderDraft.items.filter((item) => item.id !== id) } })),
    startEdit: (order: PurchaseOrderResponse) => setState((current) => ({ ...current, selectedOrderId: order.id, editingOrderId: order.id, receivingFormOpen: false, orderDraft: { supplierId: String(order.supplierId), expectedDeliveryDate: order.expectedDeliveryDate ?? '', observation: order.observation ?? '', items: order.items.map((item) => ({ id: crypto.randomUUID(), productId: String(item.productId), requestedQuantity: String(item.requestedQuantity), unitCost: String(item.unitCost) })) }, reviewing: null, feedback: '', feedbackIsError: false })),
    cancelEdit: () => setState((current) => ({ ...current, editingOrderId: null, orderDraft: emptyOrderDraft(), reviewing: null, pendingOrderWrite: null })),
    submitOrder,
    confirmOrderWrite: () => { if (state.pendingOrderWrite) void sendOrder(state.pendingOrderWrite); },
    retryOrderWrite: () => { if (state.pendingOrderWrite?.kind === 'create') void sendOrder(state.pendingOrderWrite); },
    verifyOrderWrite: async () => {
      const pending = state.pendingOrderWrite;
      if (pending?.kind !== 'update') return;
      try {
        const latest = await getPurchaseOrder(pending.id);
        setOrderDetail({ status: 'success', data: latest, error: '' });
        setState((current) => ({ ...current, pendingOrderWrite: null, editingOrderId: null, reviewing: null, uncertain: false, orderDraft: { supplierId: String(latest.supplierId), expectedDeliveryDate: latest.expectedDeliveryDate ?? '', observation: latest.observation ?? '', items: latest.items.map((item) => ({ id: crypto.randomUUID(), productId: String(item.productId), requestedQuantity: String(item.requestedQuantity), unitCost: String(item.unitCost) })) }, revision: current.revision + 1, feedback: 'Pedido consultado. Revise a versão e os dados atuais antes de editar novamente.', feedbackIsError: false }));
      } catch (error) { setState((current) => ({ ...current, feedback: error instanceof Error ? error.message : 'Não foi possível consultar o pedido.', feedbackIsError: true })); }
    },
    beginReceiving,
    cancelReceiving: () => setState((current) => ({ ...current, receivingFormOpen: false, receivingDraft: emptyReceivingDraft(), reviewing: null, pendingReceivingWrite: null })),
    editReceivingDraft: <K extends keyof Omit<ReceivingDraft, 'items'>>(field: K, value: ReceivingDraft[K]) => setState((current) => ({ ...current, receivingDraft: { ...current.receivingDraft, [field]: value }, feedback: '' })),
    editReceivingItem,
    addReceivingItem: () => setState((current) => ({ ...current, receivingDraft: { ...current.receivingDraft, items: [...current.receivingDraft.items, newReceivingItem()] } })),
    removeReceivingItem: (id: string) => setState((current) => ({ ...current, receivingDraft: { ...current.receivingDraft, items: current.receivingDraft.items.filter((item) => item.id !== id) } })),
    submitReceiving,
    confirmReceivingWrite: () => { if (state.pendingReceivingWrite) void sendReceiving(state.pendingReceivingWrite); },
    retryReceivingWrite: () => { if (state.pendingReceivingWrite) void sendReceiving(state.pendingReceivingWrite); },
    cancelReview: () => setState((current) => ({ ...current, reviewing: null, pendingOrderWrite: null, pendingReceivingWrite: null })),
    changeOrderStatus, verifyOrder, deleteOrder, verifyOrderDeletion, changeReceivingStatus, verifyReceiving,
    setBusy: (busy: boolean) => setState((current) => ({ ...current, busy })),
    setUncertain: (uncertain: boolean) => setState((current) => ({ ...current, uncertain })),
  };
}
