import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { ApiTransferForm, TransferCreateState, TransferPayload } from '@/types/transfer-api.types';
import { createTransfer, getTransferContext } from '@/services/transferService';
import { getInventoryRows } from '@/services/inventoryService';
import { ApiRequestError } from '@/services/apiClient';
import { toTransferPayload, transferFormErrors } from '@/utils/transferApiValidation';
import { useApiQuery } from './useApiQuery';

const initialForm: ApiTransferForm = { destinationStoreId: '', observation: '', items: [{ id: 'first', inventoryId: '', quantity: '' }] };

export function useNewTransfer() {
  const lock = useRef(false);
  const [state, setState] = useState<TransferCreateState>({ form: initialForm, errors: {}, busy: false, reviewing: false, failed: false, message: '', pending: null, created: null, revision: 0 });
  const context = useApiQuery(getTransferContext, null, state.revision);
  const inventory = useApiQuery(getInventoryRows, [], state.revision);
  const available = inventory.data.filter((item) => item.inventoryType === 'NORMAL' && item.currentQuantity > 0 && item.storeId === context.data?.profile.storeId);
  const destinations = context.data?.stores.filter((store) => store.active && store.id !== context.data?.profile.storeId) ?? [];
  const ready = context.status === 'success' && inventory.status === 'success' && Boolean(context.data);
  const blocked = state.busy || Boolean(state.pending) || Boolean(state.created);

  function change(field: 'destinationStoreId' | 'observation', value: string): void {
    if (blocked) return;
    setState((previous) => ({ ...previous, form: { ...previous.form, [field]: value }, errors: {}, reviewing: false, message: '' }));
  }
  function changeItem(id: string, field: 'inventoryId' | 'quantity', value: string): void {
    if (blocked) return;
    setState((previous) => ({ ...previous, form: { ...previous.form, items: previous.form.items.map((item) => item.id === id
      ? { ...item, [field]: value, ...(field === 'inventoryId' ? { quantity: '' } : {}) } : item) }, errors: {}, reviewing: false, message: '' }));
  }
  function addItem(): void {
    if (blocked) return;
    const id = crypto.randomUUID();
    setState((previous) => ({ ...previous, form: { ...previous.form, items: [...previous.form.items, { id, inventoryId: '', quantity: '' }] }, errors: {}, reviewing: false }));
  }
  function removeItem(id: string): void {
    if (blocked) return;
    setState((previous) => ({ ...previous, form: { ...previous.form, items: previous.form.items.filter((item) => item.id !== id) }, errors: {}, reviewing: false }));
  }
  function review(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!ready || blocked || !context.data) return;
    const errors = transferFormErrors(state.form, available, context.data.profile.storeId);
    if (context.data.storeListAvailable && !destinations.some((store) => String(store.id) === state.form.destinationStoreId)) errors.destinationStoreId = 'Selecione uma loja ativa disponível.';
    if (Object.keys(errors).length) {
      setState((previous) => ({ ...previous, errors, failed: true, message: 'Revise os dados indicados.' }));
      const id = errors.destinationStoreId ? 'transfer-destination' : errors.observation ? 'transfer-observation' : 'transfer-items';
      event.currentTarget.querySelector<HTMLElement>(`#${id}`)?.focus();
      return;
    }
    setState((previous) => ({ ...previous, errors: {}, failed: false, reviewing: true, message: '' }));
    window.requestAnimationFrame(() => document.getElementById('transfer-create-review')?.focus());
  }
  async function send(payload: TransferPayload, key: string): Promise<void> {
    if (lock.current) return;
    lock.current = true;
    setState((previous) => ({ ...previous, busy: true, pending: { payload, key }, failed: false, message: 'Solicitando transferência…' }));
    try {
      const created = await createTransfer(payload, key);
      setState((previous) => ({ ...previous, created, busy: false, pending: null, reviewing: false, message: `Transferência ${created.id} confirmada pelo servidor.`, failed: false }));
    } catch (error) {
      const rejected = error instanceof ApiRequestError && error.status >= 400 && error.status < 500;
      setState((previous) => ({ ...previous, busy: false, failed: true, pending: rejected ? null : { payload, key }, reviewing: !rejected,
        revision: rejected ? previous.revision + 1 : previous.revision, message: error instanceof Error ? error.message : 'Não foi possível confirmar a solicitação.' }));
    } finally {
      lock.current = false;
      window.requestAnimationFrame(() => document.getElementById('transfer-create-feedback')?.focus());
    }
  }
  async function confirm(): Promise<void> {
    if (!ready || blocked || !state.reviewing || !context.data) return;
    try { await send(toTransferPayload(state.form, available, context.data.profile.storeId), crypto.randomUUID()); }
    catch (error) { setState((previous) => ({ ...previous, failed: true, reviewing: false, message: error instanceof Error ? error.message : 'Confira os dados.' })); }
  }
  return { state, context, inventory, available, destinations, ready, blocked, change, changeItem, addItem, removeItem, review, confirm,
    retry: async () => { if (state.pending && !state.busy) await send(state.pending.payload, state.pending.key); },
    cancelReview: () => { if (!blocked) setState((previous) => ({ ...previous, reviewing: false })); window.requestAnimationFrame(() => document.getElementById('transfer-create-review-button')?.focus()); },
    reset: () => { if (!state.busy && !state.pending) setState((previous) => ({ ...previous, form: initialForm, errors: {}, created: null, reviewing: false, message: '', failed: false, revision: previous.revision + 1 })); } };
}
