import { useCallback, useRef, useState } from 'react';
import type { ApiTransfer, TransferDetailProps, TransferDetailState, TransferAction } from '@/types/transfer-api.types';
import { getTransfer, receiveTransfer, updateTransferStatus } from '@/services/transferService';
import { getCurrentProfile } from '@/services/profileService';
import { allowedTransferActions } from '@/utils/transferApiValidation';
import { useApiQuery } from './useApiQuery';

export function useTransferDetails({ id, onChanged }: TransferDetailProps) {
  const load = useCallback((signal: AbortSignal) => getTransfer(id, signal), [id]);
  const query = useApiQuery(load, null);
  const profile = useApiQuery(getCurrentProfile, null);
  const lock = useRef(false);
  const receiptKey = useRef<string | null>(null);
  const [state, setState] = useState<TransferDetailState>({ data: null, action: null, busy: false, uncertain: false, failed: false, message: '' });
  const transfer = state.data ?? query.data;
  const actions = transfer && profile.data && !state.uncertain ? allowedTransferActions(transfer, profile.data.storeId) : [];

  function review(action: TransferAction): void {
    if (state.busy || !actions.includes(action)) return;
    setState((previous) => ({ ...previous, action, failed: false, message: '' }));
    window.requestAnimationFrame(() => document.getElementById(`transfer-action-review-${id}`)?.focus());
  }
  async function confirm(): Promise<void> {
    if (lock.current || !state.action || !actions.includes(state.action)) return;
    const action = state.action;
    lock.current = true;
    setState((previous) => ({ ...previous, busy: true, failed: false, message: 'Atualizando transferência…' }));
    try {
      let updated: ApiTransfer;
      if (action === 'receive') {
        receiptKey.current ??= crypto.randomUUID();
        updated = await receiveTransfer(id, receiptKey.current);
      } else updated = await updateTransferStatus(id, action === 'send' ? 'IN_TRANSIT' : 'CANCELED');
      setState({ data: updated, action: null, busy: false, uncertain: false, failed: false, message: 'Operação confirmada pelo servidor.' });
      onChanged();
    } catch (error) {
      setState((previous) => ({ ...previous, busy: false, action: null, uncertain: true, failed: true,
        message: `${error instanceof Error ? error.message : 'Não foi possível confirmar a operação.'} Consulte o estado antes de continuar.` }));
    } finally {
      lock.current = false;
      window.requestAnimationFrame(() => document.getElementById(`transfer-feedback-${id}`)?.focus());
    }
  }
  async function reload(): Promise<void> {
    if (lock.current) return;
    lock.current = true;
    setState((previous) => ({ ...previous, busy: true, failed: false, message: 'Consultando estado…' }));
    try {
      const latest = await getTransfer(id);
      setState({ data: latest, action: null, busy: false, uncertain: false, failed: false, message: 'Estado atualizado pelo servidor.' });
      onChanged();
    } catch (error) { setState((previous) => ({ ...previous, busy: false, failed: true, message: error instanceof Error ? error.message : 'Não foi possível consultar o estado.' })); }
    finally { lock.current = false; }
  }
  return { state, transfer, query, profile, actions, review, confirm, reload,
    cancelReview: () => { setState((previous) => ({ ...previous, action: null })); window.requestAnimationFrame(() => document.getElementById(`transfer-action-${state.action}-${id}`)?.focus()); } };
}
