import { useRef, useState } from 'react';
import type { AccessActivationDraft, AccessActivationState } from '@/types/access-activation.types';
import { activateAccess } from '@/services/accessActivationService';
import { validateAccessActivation } from '@/utils/accessActivationValidation';

export function useAccessActivation(token: string) {
  const lock = useRef(false);
  const [state, setState] = useState<AccessActivationState>({ draft: { email: '', firebasePassword: '', newPassword: '', confirmation: '' }, status: 'idle', message: '' });
  async function submit(): Promise<void> {
    if (lock.current || state.status === 'success') return;
    try {
      validateAccessActivation(token, state.draft);
      lock.current = true;
      setState(current => ({ ...current, status: 'saving', message: 'Ativando seu acesso…' }));
      await activateAccess(token, state.draft);
      setState(current => ({ ...current, draft: { ...current.draft, firebasePassword: '', newPassword: '', confirmation: '' }, status: 'success', message: 'Acesso ativado. Entre com seu e-mail e suas senhas.' }));
    } catch (error) {
      setState(current => ({ ...current, status: 'error', message: error instanceof Error ? error.message : 'Não foi possível confirmar a ativação. Tente entrar antes de repetir.' }));
    } finally { lock.current = false; }
  }
  return { state, submit, change: (field: keyof AccessActivationDraft, value: string) => setState(current => ({ ...current, draft: { ...current.draft, [field]: value } })) };
}
