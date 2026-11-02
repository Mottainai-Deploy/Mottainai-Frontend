import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PasswordChangeDraft, PasswordChangeState } from '@/types/password-change.types';
import { passwordChangePayload } from '@/utils/passwordChangeValidation';
import { changeOperationalPassword } from '@/services/passwordChangeService';
import { useAuth } from './useAuth';

export function usePasswordChange() {
  const [state, setState] = useState<PasswordChangeState>({ values: { currentPassword: '', newPassword: '', confirmation: '' }, status: 'idle', message: '' });
  const lock = useRef(false);
  const navigate = useNavigate();
  const { logout } = useAuth();
  function review(): void {
    if (lock.current) return;
    try { passwordChangePayload(state.values); setState(previous => ({ ...previous, status: 'review', message: '' })); }
    catch (error) { setState(previous => ({ ...previous, status: 'error', message: error instanceof Error ? error.message : 'Revise as senhas.' })); }
  }
  async function confirm(): Promise<void> {
    if (lock.current || state.status !== 'review') return;
    lock.current = true;
    setState(previous => ({ ...previous, status: 'saving', message: 'Alterando senha operacional…' }));
    try {
      await changeOperationalPassword(state.values);
      navigate('/login', { replace: true, state: { passwordChanged: true } });
    } catch (error) {
      setState(previous => ({ ...previous, status: 'error', values: { currentPassword: '', newPassword: '', confirmation: '' }, message: `${error instanceof Error ? error.message : 'Resposta inconclusiva.'} Se a conexão foi interrompida, entre novamente para verificar qual senha foi efetivada.` }));
    } finally { lock.current = false; }
  }
  return { state, review, confirm, leave: () => { logout(); navigate('/login', { replace: true }); },
    change: (field: keyof PasswordChangeDraft, value: string) => { if (!lock.current) setState(previous => ({ ...previous, status: 'idle', message: '', values: { ...previous.values, [field]: value } })); },
    cancel: () => setState(previous => ({ ...previous, status: 'idle' })) };
}
