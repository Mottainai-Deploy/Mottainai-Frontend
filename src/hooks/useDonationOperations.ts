import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiRequestError } from '@/services/apiClient';
import { getCurrentProfile } from '@/services/profileService';
import { createDonation, getDonation, getDonations, updateDonationStatus } from '@/services/donationService';
import { useApiQuery } from '@/hooks/useApiQuery';
import { currentMonthRange, operationDateParams, operationalQueryForRange } from '@/utils/operationDateRange';
import { donationPayload } from '@/utils/operationalValidation';
import { requireInventoryId } from '@/utils/inventoryValidation';
import type { InventoryRow } from '@/types/inventory-api.types';
import type { DonationResponse, DonationStatus, CreateDonationPayload } from '@/types/donation-api.types';
import type { OperationDateRange } from '@/types/stock-disposal.types';
import type { DonationDraft, DonationDraftItem, DonationOperationsState, PendingDonationWrite } from '@/types/donation-operations.types';

interface DonationOperationsData { storeId: number; donations: DonationResponse[]; }
type DetailState = { status: 'idle' | 'loading' | 'success' | 'error'; data: DonationResponse | null; error: string };

const emptyDraft = (): DonationDraft => ({ institution: '', observation: '', items: [newItem()] });
const newItem = (): DonationDraftItem => ({ id: crypto.randomUUID(), batchId: '', donatedQuantity: '' });

function numeric(value: string): number {
  const parsed = Number(value.trim().replace(',', '.'));
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error('Informe uma quantidade maior que zero.');
  return parsed;
}

export function useDonationOperations(trackedId: number | null, inventory: InventoryRow[]) {
  const lock = useRef(false);
  const initialRange = currentMonthRange();
  const [state, setState] = useState<DonationOperationsState>(() => ({
    range: initialRange, appliedRange: initialRange, revision: 0, selectedId: trackedId, creating: trackedId === null,
    draft: emptyDraft(), pending: null, reviewing: false, busy: false, uncertain: false,
    feedback: '', feedbackIsError: false,
  }));
  useEffect(() => { setState((current) => current.selectedId === trackedId ? current : ({ ...current, selectedId: trackedId, creating: trackedId === null })); }, [trackedId]);
  const load = useCallback(async (signal: AbortSignal): Promise<DonationOperationsData> => {
    const profile = await getCurrentProfile(signal);
    const query = operationalQueryForRange(profile.storeId, state.appliedRange);
    const donations = await getDonations(query, signal);
    return { storeId: profile.storeId, donations };
  }, [state.appliedRange]);
  const query = useApiQuery(load, { storeId: 0, donations: [] }, state.revision);
  const [detail, setDetail] = useState<DetailState>({ status: 'idle', data: null, error: '' });
  useEffect(() => {
    if (state.selectedId === null) { setDetail({ status: 'idle', data: null, error: '' }); return; }
    const controller = new AbortController();
    setDetail({ status: 'loading', data: null, error: '' });
    void getDonation(state.selectedId, controller.signal).then((data) => { if (!controller.signal.aborted) setDetail({ status: 'success', data, error: '' }); })
      .catch((error: unknown) => { if (!controller.signal.aborted) setDetail({ status: 'error', data: null, error: error instanceof Error ? error.message : 'Não foi possível consultar a doação.' }); });
    return () => controller.abort();
  }, [state.selectedId, state.revision]);

  function addItem(): void { setState((current) => ({ ...current, draft: { ...current.draft, items: [...current.draft.items, newItem()] } })); }
  function editItem<K extends keyof Omit<DonationDraftItem, 'id'>>(id: string, field: K, value: DonationDraftItem[K]): void {
    setState((current) => ({ ...current, draft: { ...current.draft, items: current.draft.items.map((item) => item.id === id ? { ...item, [field]: value } : item) }, feedback: '' }));
  }
  function submit(): void {
    if (lock.current || state.busy || state.uncertain || !state.creating) return;
    try {
      const payload: CreateDonationPayload = donationPayload({ institution: state.draft.institution, observation: state.draft.observation, items: state.draft.items.map((item) => ({ batchId: requireInventoryId(item.batchId), donatedQuantity: numeric(item.donatedQuantity) })) });
      setState((current) => ({ ...current, pending: { payload, key: crypto.randomUUID() }, reviewing: true, feedback: '', feedbackIsError: false }));
    } catch (error) { setState((current) => ({ ...current, feedback: error instanceof Error ? error.message : 'Revise os dados da doação.', feedbackIsError: true })); }
  }
  async function send(pending: PendingDonationWrite): Promise<void> {
    if (lock.current) return;
    lock.current = true;
    setState((current) => ({ ...current, busy: true, feedback: 'Registrando doação…', feedbackIsError: false }));
    try {
      const result = await createDonation(pending.payload, pending.key);
      setState((current) => ({ ...current, busy: false, uncertain: false, pending: null, reviewing: false, creating: false, selectedId: result.id, revision: current.revision + 1, draft: emptyDraft(), feedback: `Doação ${result.id} registrada. A saída só será lançada quando a doação for concluída.`, feedbackIsError: false }));
    } catch (error) {
      const rejected = error instanceof ApiRequestError && error.status >= 400 && error.status < 500;
      setState((current) => ({ ...current, busy: false, uncertain: !rejected, pending: rejected ? null : pending, reviewing: !rejected, feedback: error instanceof Error ? error.message : 'Não foi possível confirmar a doação.', feedbackIsError: true }));
    } finally { lock.current = false; }
  }
  async function changeStatus(id: number, status: Exclude<DonationStatus, 'REGISTERED'>): Promise<void> {
    await updateDonationStatus(id, status);
    setState((current) => ({ ...current, selectedId: id, revision: current.revision + 1 }));
  }
  async function verify(id: number): Promise<void> {
    const data = await getDonation(id);
    setDetail({ status: 'success', data, error: '' });
    setState((current) => ({ ...current, selectedId: id, revision: current.revision + 1 }));
  }

  return {
    state, query, detail,
    available: inventory.filter((row) => row.storeId === query.data.storeId && row.inventoryType === 'NORMAL' && row.currentQuantity > 0),
    submit, confirm: () => { if (state.pending) void send(state.pending); }, retry: () => { if (state.pending) void send(state.pending); },
    edit: <K extends keyof Omit<DonationDraft, 'items'>>(field: K, value: DonationDraft[K]) => setState((current) => ({ ...current, draft: { ...current.draft, [field]: value }, feedback: '' })),
    editItem, addItem, removeItem: (id: string) => setState((current) => ({ ...current, draft: { ...current.draft, items: current.draft.items.filter((item) => item.id !== id) } })),
    cancelReview: () => setState((current) => ({ ...current, pending: null, reviewing: false })),
    select: (id: number | null) => setState((current) => ({ ...current, selectedId: id, creating: false })),
    startCreate: () => setState((current) => ({ ...current, selectedId: null, creating: true, draft: emptyDraft(), feedback: '', feedbackIsError: false })),
    cancelCreate: () => setState((current) => ({ ...current, creating: false, draft: emptyDraft(), reviewing: false, pending: null })),
    refresh: () => setState((current) => ({ ...current, revision: current.revision + 1 })),
    changeRange: (field: keyof OperationDateRange, value: string) => setState((current) => ({ ...current, range: { ...current.range, [field]: value } })),
    applyRange: () => {
      try { operationDateParams(state.range); setState((current) => ({ ...current, appliedRange: { ...current.range }, feedback: '', feedbackIsError: false })); }
      catch (error) { setState((current) => ({ ...current, feedback: error instanceof Error ? error.message : 'Informe um período válido.', feedbackIsError: true })); }
    },
    changeStatus, verify,
    setBusy: (busy: boolean) => setState((current) => ({ ...current, busy })),
    setUncertain: (uncertain: boolean) => setState((current) => ({ ...current, uncertain })),
  };
}
