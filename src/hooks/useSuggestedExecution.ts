import { useEffect, useRef, useState } from 'react';
import type { ExecutionDraft, ExecutionDraftItem, ExecutionState, SuggestedExecutionProps } from '@/types/suggested-execution.types';
import { executeSuggestedAction, getExecutionContext } from '@/services/suggestedActionService';
import { ApiRequestError } from '@/services/apiClient';
import { emptyExecutionDraft, newExecutionItem, toExecutionPayload } from '@/utils/suggestedExecutionValidation';

export function useSuggestedExecution({ action, storeId }: SuggestedExecutionProps) {
  const [state, setState] = useState<ExecutionState>(() => ({ reload: 0, draft: emptyExecutionDraft(), context: null, loading: true, busy: false, error: '', uncertain: false, pending: null, result: null }));
  const busyRef = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    const controller = new AbortController();
    setState((current) => ({ ...current, loading: true, error: '', context: null }));
    void getExecutionContext(action.actionType, controller.signal).then((context) => {
      if (!controller.signal.aborted) setState((current) => ({ ...current, context, loading: false }));
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setState((current) => ({ ...current, loading: false, error: error instanceof Error ? error.message : 'Falha ao consultar os dados.' }));
    });
    return () => controller.abort();
  }, [action.actionType, state.reload]);
  const locked = state.loading || state.busy || !!state.pending || !!state.result || !state.context;
  const change = (field: keyof Omit<ExecutionDraft, 'items'>, value: string) => {
    if (!locked) setState((current) => ({ ...current, draft: { ...current.draft, [field]: value }, error: '' }));
  };
  const changeItem = (id: string, field: keyof Omit<ExecutionDraftItem, 'id'>, value: string) => {
    if (!locked) setState((current) => ({ ...current, draft: { ...current.draft, items: current.draft.items.map((item) => item.id === id ? { ...item, [field]: value } : item) }, error: '' }));
  };
  const review = () => {
    if (locked || !state.context) return;
    try {
      const payload = toExecutionPayload(action, storeId, state.draft, state.context);
      setState((current) => ({ ...current, pending: { payload, key: crypto.randomUUID() }, error: '', uncertain: false }));
    } catch (error) { setState((current) => ({ ...current, error: error instanceof Error ? error.message : 'Revise os campos.' })); }
  };
  const confirm = async () => {
    if (busyRef.current || !state.pending || state.result) return;
    busyRef.current = true;
    setState((current) => ({ ...current, busy: true, error: '' }));
    try {
      const result = await executeSuggestedAction(action.id, state.pending.payload, state.pending.key);
      if (mounted.current) setState((current) => ({ ...current, result, pending: null, uncertain: false }));
    } catch (error) {
      const uncertain = !(error instanceof ApiRequestError && error.status >= 400 && error.status < 500);
      if (mounted.current) setState((current) => ({ ...current, uncertain, pending: uncertain ? current.pending : null,
        error: uncertain ? 'Resultado não confirmado. Preserve os dados e reenvie a mesma execução para recuperar o resultado com a mesma chave.' : error.message,
      }));
    } finally {
      busyRef.current = false;
      if (mounted.current) setState((current) => ({ ...current, busy: false }));
    }
  };
  return { state, locked, change, changeItem, review, confirm,
    addItem: () => { if (!locked) setState((current) => ({ ...current, draft: { ...current.draft, items: [...current.draft.items, newExecutionItem()] } })); },
    removeItem: (id: string) => { if (!locked) setState((current) => ({ ...current, draft: { ...current.draft, items: current.draft.items.filter((item) => item.id !== id) } })); },
    cancelReview: () => { if (!busyRef.current && !state.uncertain) setState((current) => ({ ...current, pending: null })); },
    reload: () => { if (!busyRef.current && !state.pending) setState((current) => ({ ...current, reload: current.reload + 1 })); },
  };
}
