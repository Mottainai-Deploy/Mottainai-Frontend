import type { PasswordChangeDraft } from '@/types/password-change.types';
import { passwordChangePayload } from '@/utils/passwordChangeValidation';
import { apiRequest, serviceError, setApiSession } from './apiClient';

export async function changeOperationalPassword(values: PasswordChangeDraft): Promise<void> {
  try {
    const body = passwordChangePayload(values);
    await apiRequest<void>('/auth/password', { method: 'PUT', body });
    setApiSession(null);
    window.dispatchEvent(new CustomEvent('mottainai:session-expired', { detail: { reason: 'password-changed' } }));
  } catch (error) { throw serviceError(error, 'Não foi possível alterar a senha operacional.'); }
}
