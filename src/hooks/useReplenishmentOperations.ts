import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiRequestError } from '@/services/apiClient';
import { getCurrentProfile } from '@/services/profileService';
import { getProducts } from '@/services/productService';
import { getInventoryRows } from '@/services/inventoryService';
import { executeReplenishment, generateReplenishmentPreList, getReplenishmentExecution, getReplenishmentExecutions, getReplenishmentPreList, getReplenishmentPreLists } from '@/services/replenishmentService';
import { useApiQuery } from '@/hooks/useApiQuery';
import { currentMonthRange, operationDateParams, operationalQueryForRange } from '@/utils/operationDateRange';
import { replenishmentPayload } from '@/utils/operationalValidation';
import { requireInventoryId } from '@/utils/inventoryValidation';
import type { CatalogProduct } from '@/types/catalog-product.types';
import type { InventoryRow } from '@/types/inventory-api.types';
import type { ReplenishmentExecutionResponse, ReplenishmentPreListResponse } from '@/types/replenishment-api.types';
import type { OperationDateRange } from '@/types/stock-disposal.types';
import type { PendingReplenishmentWrite, ReplenishmentDraftItem, ReplenishmentExecutionDraft, ReplenishmentOperationsState } from '@/types/replenishment-operations.types';

interface ReplenishmentData {
  storeId: number;
  products: CatalogProduct[];
  inventory: InventoryRow[];
  preLists: ReplenishmentPreListResponse[];
  executions: ReplenishmentExecutionResponse[];
}
type PreListDetailState = { status: 'idle' | 'loading' | 'success' | 'error'; data: ReplenishmentPreListResponse | null; error: string };
type ExecutionDetailState = { status: 'idle' | 'loading' | 'success' | 'error'; data: ReplenishmentExecutionResponse | null; error: string };

const makeItem = (productId: number, quantity = ''): ReplenishmentDraftItem => ({ id: crypto.randomUUID(), productId, batchId: '', replenishedQuantity: quantity });

function numeric(value: string): number {
  const normalized = value.trim().replace(',', '.');
  if (!normalized || !Number.isFinite(Number(normalized))) throw new Error('Informe uma quantidade válida.');
  return Number(normalized);
}

export function useReplenishmentOperations(trackedPreListId: number | null) {
  const lock = useRef(false);
  const initialRange = currentMonthRange();
  const [state, setState] = useState<ReplenishmentOperationsState>(() => ({ range: initialRange, appliedRange: initialRange, revision: 0, selectedPreListId: trackedPreListId, selectedExecutionId: null, draft: null, pending: null, reviewing: false, busy: false, uncertain: false, feedback: '', feedbackIsError: false }));
  useEffect(() => { setState((current) => current.selectedPreListId === trackedPreListId ? current : ({ ...current, selectedPreListId: trackedPreListId, selectedExecutionId: null, draft: null })); }, [trackedPreListId]);
  const load = useCallback(async (signal: AbortSignal): Promise<ReplenishmentData> => {
    const profile = await getCurrentProfile(signal);
    const query = operationalQueryForRange(profile.storeId, state.appliedRange);
    const [products, inventory, preLists, executions] = await Promise.all([
      getProducts(signal), getInventoryRows(signal), getReplenishmentPreLists(profile.storeId, signal), getReplenishmentExecutions(query, signal),
    ]);
    return { storeId: profile.storeId, products, inventory, preLists, executions };
  }, [state.appliedRange]);
  const query = useApiQuery(load, { storeId: 0, products: [], inventory: [], preLists: [], executions: [] }, state.revision);
  const [preListDetail, setPreListDetail] = useState<PreListDetailState>({ status: 'idle', data: null, error: '' });
  const [executionDetail, setExecutionDetail] = useState<ExecutionDetailState>({ status: 'idle', data: null, error: '' });

  useEffect(() => {
    if (state.selectedPreListId === null) { setPreListDetail({ status: 'idle', data: null, error: '' }); return; }
    const controller = new AbortController();
    setPreListDetail({ status: 'loading', data: null, error: '' });
    void getReplenishmentPreList(state.selectedPreListId, controller.signal).then((data) => { if (!controller.signal.aborted) setPreListDetail({ status: 'success', data, error: '' }); })
      .catch((error: unknown) => { if (!controller.signal.aborted) setPreListDetail({ status: 'error', data: null, error: error instanceof Error ? error.message : 'Não foi possível consultar a pré-lista.' }); });
    return () => controller.abort();
  }, [state.selectedPreListId, state.revision]);

  useEffect(() => {
    if (state.selectedExecutionId === null) { setExecutionDetail({ status: 'idle', data: null, error: '' }); return; }
    const controller = new AbortController();
    setExecutionDetail({ status: 'loading', data: null, error: '' });
    void getReplenishmentExecution(state.selectedExecutionId, controller.signal).then((data) => { if (!controller.signal.aborted) setExecutionDetail({ status: 'success', data, error: '' }); })
      .catch((error: unknown) => { if (!controller.signal.aborted) setExecutionDetail({ status: 'error', data: null, error: error instanceof Error ? error.message : 'Não foi possível consultar a execução.' }); });
    return () => controller.abort();
  }, [state.selectedExecutionId, state.revision]);

  const available = query.data.inventory.filter((row) => row.storeId === query.data.storeId && row.inventoryType === 'NORMAL' && row.currentQuantity > 0);
  function startExecution(preList: ReplenishmentPreListResponse): void {
    if (state.busy || state.uncertain || !['GENERATED', 'IN_PROGRESS'].includes(preList.status)) return;
    setState((current) => ({ ...current, selectedPreListId: preList.id, selectedExecutionId: null, draft: { preListId: preList.id, rating: '', comment: '', items: preList.items.map((item) => makeItem(item.productId, String(item.suggestedQuantity))) }, reviewing: false, feedback: '', feedbackIsError: false }));
  }
  function editItem(id: string, field: 'batchId' | 'replenishedQuantity', value: string): void {
    setState((current) => current.draft ? ({ ...current, draft: { ...current.draft, items: current.draft.items.map((item) => item.id === id ? { ...item, [field]: value } : item) }, feedback: '' }) : current);
  }
  function submitExecution(): void {
    if (lock.current || state.busy || state.uncertain || !state.draft) return;
    try {
      const payload = replenishmentPayload({ preListId: state.draft.preListId, rating: state.draft.rating ? Number(state.draft.rating) : null, comment: state.draft.comment, items: state.draft.items.map((item) => ({ batchId: requireInventoryId(item.batchId), replenishedQuantity: numeric(item.replenishedQuantity) })) });
      setState((current) => ({ ...current, pending: { kind: 'execute', payload, key: crypto.randomUUID() }, reviewing: true, feedback: '', feedbackIsError: false }));
    } catch (error) { setState((current) => ({ ...current, feedback: error instanceof Error ? error.message : 'Revise os dados da execução.', feedbackIsError: true })); }
  }
  function askGenerate(): void {
    if (state.busy || state.uncertain) return;
    setState((current) => ({ ...current, pending: { kind: 'generate', key: crypto.randomUUID() }, reviewing: true, feedback: '', feedbackIsError: false }));
  }
  async function send(pending: PendingReplenishmentWrite): Promise<void> {
    if (lock.current) return;
    lock.current = true;
    setState((current) => ({ ...current, busy: true, feedback: pending.kind === 'generate' ? 'Gerando pré-lista…' : 'Executando reposição…', feedbackIsError: false }));
    try {
      if (pending.kind === 'generate') {
        const result = await generateReplenishmentPreList(pending.key);
        setState((current) => ({ ...current, busy: false, uncertain: false, pending: null, reviewing: false, selectedPreListId: result.id, selectedExecutionId: null, revision: current.revision + 1, feedback: `Pré-lista ${result.id} gerada. A geração não executa reposição nem altera o estoque.`, feedbackIsError: false }));
      } else {
        const result = await executeReplenishment(pending.payload, pending.key);
        setState((current) => ({ ...current, busy: false, uncertain: false, pending: null, reviewing: false, selectedPreListId: result.preListId, selectedExecutionId: result.id, draft: null, revision: current.revision + 1, feedback: `Reposição ${result.id} confirmada pelo servidor.`, feedbackIsError: false }));
      }
    } catch (error) {
      const rejected = error instanceof ApiRequestError && error.status >= 400 && error.status < 500;
      setState((current) => ({ ...current, busy: false, uncertain: !rejected, pending: rejected ? null : pending, reviewing: !rejected, feedback: error instanceof Error ? error.message : 'Não foi possível confirmar a operação.', feedbackIsError: true }));
    } finally { lock.current = false; }
  }
  async function verifyPreList(id: number): Promise<void> {
    const data = await getReplenishmentPreList(id);
    setPreListDetail({ status: 'success', data, error: '' });
    setState((current) => ({ ...current, selectedPreListId: id, revision: current.revision + 1 }));
  }
  async function verifyExecution(id: number): Promise<void> {
    const data = await getReplenishmentExecution(id);
    setExecutionDetail({ status: 'success', data, error: '' });
    setState((current) => ({ ...current, selectedExecutionId: id, revision: current.revision + 1 }));
  }

  return {
    state, query, preListDetail, executionDetail, available,
    askGenerate, startExecution,
    editDraft: <K extends keyof Omit<ReplenishmentExecutionDraft, 'items' | 'preListId'>>(field: K, value: ReplenishmentExecutionDraft[K]) => setState((current) => current.draft ? ({ ...current, draft: { ...current.draft, [field]: value } }) : current),
    editItem, addBatchLine: (productId: number) => setState((current) => current.draft ? ({ ...current, draft: { ...current.draft, items: [...current.draft.items, makeItem(productId)] } }) : current),
    removeItem: (id: string) => setState((current) => current.draft ? ({ ...current, draft: { ...current.draft, items: current.draft.items.filter((item) => item.id !== id) } }) : current),
    submitExecution,
    confirm: () => { if (state.pending) void send(state.pending); }, retry: () => { if (state.pending) void send(state.pending); },
    cancelReview: () => setState((current) => ({ ...current, pending: null, reviewing: false })),
    selectPreList: (id: number | null) => setState((current) => ({ ...current, selectedPreListId: id, selectedExecutionId: null, draft: null })),
    selectExecution: (id: number | null) => setState((current) => ({ ...current, selectedExecutionId: id, selectedPreListId: null, draft: null })),
    refresh: () => setState((current) => ({ ...current, revision: current.revision + 1 })),
    changeRange: (field: keyof OperationDateRange, value: string) => setState((current) => ({ ...current, range: { ...current.range, [field]: value } })),
    applyRange: () => {
      try { operationDateParams(state.range); setState((current) => ({ ...current, appliedRange: { ...current.range }, feedback: '', feedbackIsError: false })); }
      catch (error) { setState((current) => ({ ...current, feedback: error instanceof Error ? error.message : 'Informe um período válido.', feedbackIsError: true })); }
    },
    verifyPreList, verifyExecution,
  };
}
