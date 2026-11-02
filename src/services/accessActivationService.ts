import type { AccessActivationDraft } from '@/types/access-activation.types';
import { validateAccessActivation } from '@/utils/accessActivationValidation';
import { ApiRequestError, apiRequest, serviceError } from './apiClient';
import { getFirebaseIdToken } from './firebaseAuthService';
import { firebaseIdentitySummary } from '@/utils/firebaseIdentitySummary';
import { apiErrorMessage } from '@/utils/apiErrorMessages';

export async function activateAccess(token: string, draft: AccessActivationDraft): Promise<void> {
  try {
    validateAccessActivation(token, draft);
    const firebaseIdToken = await getFirebaseIdToken({ email: draft.email.trim(), password: draft.firebasePassword });
    const validation = await apiRequest<{ valid: boolean }>(`/auth/password-reset/validate?${new URLSearchParams({ token })}`, { authenticated: false });
    if (!validation.valid) throw new Error('Este convite expirou ou já foi utilizado. Se você acabou de ativar a conta, tente entrar no login.');
    try {
      await apiRequest<void>('/auth/password-reset', { method: 'POST', authenticated: false, body: { token, firebaseIdToken, newPassword: draft.newPassword } });
    } catch (error) {
      const mismatch = apiErrorMessage({ message: 'Invitation is already linked to another Firebase account' }, 400);
      if (error instanceof ApiRequestError && error.status === 400 && error.message === mismatch) {
        const identity = firebaseIdentitySummary(firebaseIdToken);
        if (identity) throw new Error(`O Firebase autenticou ${identity.email}, com UID ${identity.uid}. Esse UID difere do cadastrado no convite. Confira o usuário no Firebase Authentication.`, { cause: error });
      }
      throw error;
    }
  } catch (error) { throw serviceError(error, 'Não foi possível ativar seu acesso.'); }
}
