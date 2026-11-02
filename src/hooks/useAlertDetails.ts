import { useEffect, useRef, useState } from 'react';
import type { AlertDetailsProps, AlertEditorState, AlertReview } from '@/types/alert-api.types';
import { getAlert, updateAlertStatus } from '@/services/alertService';
import { decideSuggestedAction, getSuggestedActions } from '@/services/suggestedActionService';
import { ApiRequestError } from '@/services/apiClient';
import { requireInventoryId } from '@/utils/inventoryValidation';

export function useAlertDetails({ id, onChanged }: AlertDetailsProps) {
  const [state, setState] = useState<AlertEditorState>({ reload: 0, data: null, busy: false, loading: true, uncertain: false, error: '', notice: '', review: null });
  const busyRef = useRef(false);
  const mounted = useRef(true);
  const origin = useRef<HTMLElement | null>(null);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    const controller = new AbortController();
    setState((current) => ({ ...current, loading: true, error: '', notice: '', review: null }));
    void Promise.all([getAlert(id, controller.signal), getSuggestedActions(id, controller.signal)]).then(([alert, actions]) => {
      if (!controller.signal.aborted) setState((current) => ({ ...current, data: { alert, actions }, loading: false, uncertain: false, notice: 'Estado consultado no servidor.' }));
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setState((current) => ({ ...current, data: null, loading: false, error: error instanceof Error ? error.message : 'Não foi possível consultar o alerta.' }));
    });
    return () => controller.abort();
  }, [id, state.reload]);
  const blocked = state.busy || state.loading || state.uncertain || !state.data;
  const review = (action: AlertReview, button: HTMLElement) => {
    if (blocked || state.review) return;
    if (action.kind === 'decision' && !state.data?.actions.some((item) => item.id === action.id && item.status === 'PENDING')) return;
    origin.current = button;
    setState((current) => ({ ...current, review: action, error: '', notice: '' }));
  };
  const confirm = async () => {
    if (busyRef.current || blocked || !state.review) return;
    const action = state.review;
    busyRef.current = true;
    setState((current) => ({ ...current, busy: true, error: '', notice: '' }));
    try {
      requireInventoryId(id);
      if (action.kind === 'status') {
        const alert = await updateAlertStatus(id, action.status);
        if (mounted.current) setState((current) => ({ ...current, data: current.data ? { ...current.data, alert } : null }));
      } else {
        const updated = await decideSuggestedAction(action.id, action.decision);
        if (mounted.current) setState((current) => ({ ...current, data: current.data ? { ...current.data, actions: current.data.actions.map((item) => item.id === updated.id ? updated : item) } : null }));
      }
      if (mounted.current) {
        setState((current) => ({ ...current, review: null, notice: 'Operação confirmada pelo servidor. A decisão não executa a ação sugerida.' }));
        onChanged();
      }
    } catch (error) {
      if (mounted.current) setState((current) => ({ ...current, review: null, uncertain: true,
        error: error instanceof ApiRequestError ? `${error.message} Consulte o estado antes de tentar outra operação.` : 'Resultado não confirmado. O pedido pode ter sido aplicado. Consulte o estado antes de tentar outra operação.',
      }));
    } finally {
      busyRef.current = false;
      if (mounted.current) setState((current) => ({ ...current, busy: false }));
    }
  };
  return { state, blocked, review, confirm,
    reload: () => { if (!busyRef.current) setState((current) => ({ ...current, reload: current.reload + 1 })); },
    cancelReview: () => { if (!busyRef.current) { setState((current) => ({ ...current, review: null })); requestAnimationFrame(() => origin.current?.focus()); } },
  };
}
