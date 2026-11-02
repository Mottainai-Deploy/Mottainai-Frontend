import { useCallback, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { DisposalAttempt, DisposalEditorState, DisposalForm, OperationDateRange } from '@/types/stock-disposal.types';
import { getInventoryRows } from '@/services/inventoryService';
import { getDisposals, createDisposal } from '@/services/disposalService';
import { getInventoryMovements, createConsumption } from '@/services/inventoryMovementService';
import { ApiRequestError } from '@/services/apiClient';
import { currentMonthRange, operationDateParams } from '@/utils/operationDateRange';
import { disposalErrors, stockExitAttempt } from '@/utils/disposalValidation';
import { useApiQuery } from './useApiQuery';

const emptyForm: DisposalForm = { inventoryId: '', quantity: '', reason: 'Avaria', observation: '' };

export function useStockDisposals() {
  const lock = useRef(false);
  const [state, setState] = useState<DisposalEditorState>(() => {
    const range = currentMonthRange();
    return { form: emptyForm, errors: {}, reviewing: false, busy: false, failed: false, message: '', pending: null,
      created: null, range, appliedRange: range, rangeError: '', revision: 0 };
  });
  const loadDisposals = useCallback((signal: AbortSignal) => getDisposals(state.appliedRange, signal), [state.appliedRange]);
  const loadMovements = useCallback((signal: AbortSignal) => getInventoryMovements(state.appliedRange, signal), [state.appliedRange]);
  const inventory = useApiQuery(getInventoryRows, [], state.revision);
  const disposals = useApiQuery(loadDisposals, [], state.revision);
  const movements = useApiQuery(loadMovements, [], state.revision);
  const available = inventory.data.filter((item) => item.inventoryType === 'NORMAL' && item.currentQuantity > 0);
  const selected = inventory.data.find((item) => String(item.id) === state.form.inventoryId);
  const consumptions = movements.data.filter((item) => item.movementType === 'OUT' && item.observation?.startsWith('Consumo interno'));
  const blocked = state.busy || state.pending !== null;

  function change(field: keyof DisposalForm, value: string): void {
    if (blocked) return;
    setState((previous) => ({ ...previous, form: { ...previous.form, [field]: value }, errors: { ...previous.errors, [field]: undefined },
      reviewing: false, message: '', failed: false, created: null }));
  }

  function review(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (blocked || inventory.status !== 'success') return;
    const errors = disposalErrors(state.form, available);
    if (Object.keys(errors).length) {
      setState((previous) => ({ ...previous, errors, failed: true, message: 'Revise os campos indicados.' }));
      event.currentTarget.querySelector<HTMLElement>(`#disposal-${Object.keys(errors)[0]}`)?.focus();
      return;
    }
    setState((previous) => ({ ...previous, errors: {}, reviewing: true, failed: false, message: '' }));
    window.requestAnimationFrame(() => document.getElementById('disposal-review-title')?.focus());
  }

  async function send(attempt: DisposalAttempt): Promise<void> {
    if (lock.current) return;
    lock.current = true;
    setState((previous) => ({ ...previous, busy: true, pending: attempt, message: 'Registrando baixa de estoque…', failed: false }));
    try {
      const response = attempt.kind === 'consumption'
        ? await createConsumption(attempt.inventoryId, attempt.payload, attempt.key)
        : await createDisposal(attempt.payload, attempt.key);
      setState((previous) => ({ ...previous, busy: false, pending: null, reviewing: false, form: emptyForm, errors: {},
        created: { id: response.id, kind: attempt.kind }, revision: previous.revision + 1,
        message: `Baixa confirmada pelo servidor. Registro ${response.id}.`, failed: false }));
    } catch (error) {
      const rejected = error instanceof ApiRequestError && error.status >= 400 && error.status < 500;
      setState((previous) => ({ ...previous, busy: false, pending: rejected ? null : attempt, reviewing: !rejected, failed: true,
        revision: rejected ? previous.revision + 1 : previous.revision,
        message: error instanceof Error ? error.message : 'Não foi possível confirmar a baixa.' }));
    } finally {
      lock.current = false;
      window.requestAnimationFrame(() => document.getElementById('disposal-feedback')?.focus());
    }
  }

  async function confirm(): Promise<void> {
    if (blocked || !state.reviewing || inventory.status !== 'success') return;
    try {
      const attempt = stockExitAttempt(state.form, available, crypto.randomUUID());
      await send(attempt);
    } catch (error) {
      setState((previous) => ({ ...previous, reviewing: false, failed: true, message: error instanceof Error ? error.message : 'Revise os dados antes de confirmar.' }));
    }
  }

  function applyRange(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    try {
      operationDateParams(state.range);
      setState((previous) => ({ ...previous, appliedRange: { ...previous.range }, rangeError: '' }));
    } catch (error) {
      setState((previous) => ({ ...previous, rangeError: error instanceof Error ? error.message : 'Período inválido.' }));
    }
  }

  return { state, inventory, disposals, movements, available, selected, consumptions, blocked, change, review, confirm, applyRange,
    retry: async () => { if (state.pending && !state.busy) await send(state.pending); },
    cancelReview: () => {
      if (!blocked) setState((previous) => ({ ...previous, reviewing: false }));
      window.requestAnimationFrame(() => document.getElementById('disposal-review-button')?.focus());
    },
    changeRange: (field: keyof OperationDateRange, value: string) => setState((previous) => ({ ...previous, range: { ...previous.range, [field]: value }, rangeError: '' })),
    refresh: () => setState((previous) => ({ ...previous, revision: previous.revision + 1 })) };
}
