import { useRef, useState } from 'react';
import type { ConfirmedActionProps, ConfirmedActionState } from '@/types/confirmed-action.types';
import { ApiRequestError } from '@/services/apiClient';

export function useConfirmedAction(props: ConfirmedActionProps) {
  const [state, setState] = useState<ConfirmedActionState>({ stage: 'idle', message: '' });
  const lock = useRef(false);
  async function run(check: boolean): Promise<void> {
    if (lock.current || (props.disabled && !(check && state.stage === 'uncertain')) || (!check && state.stage !== 'review')) return;
    lock.current = true;
    props.onBusyChange?.(true);
    setState({ stage: 'saving', message: check ? 'Consultando estado atual…' : 'Enviando alteração…' });
    try {
      await (check ? props.verify() : props.execute());
      props.onUncertainChange?.(false);
      setState({ stage: 'success', message: check ? 'Dados consultados. Confira o estado atual antes de outra ação.' : 'Operação confirmada pelo servidor.' });
    } catch (error) {
      const rejected = !check && error instanceof ApiRequestError && error.status >= 400 && error.status < 500;
      props.onUncertainChange?.(!rejected);
      setState({ stage: rejected ? 'error' : 'uncertain', message: error instanceof Error ? error.message : 'Não foi possível confirmar a operação.' });
    } finally { lock.current = false; props.onBusyChange?.(false); }
  }
  return { state, confirm: () => run(false), verify: () => run(true),
    review: () => {
      if (lock.current || props.disabled) return;
      try { props.validate?.(); setState({ stage: 'review', message: '' }); }
      catch (error) { setState({ stage: 'error', message: error instanceof Error ? error.message : 'Revise os dados.' }); }
    },
    cancel: () => { if (!lock.current) setState({ stage: 'idle', message: '' }); } };
}
