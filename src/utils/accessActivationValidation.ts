import type { AccessActivationDraft } from '@/types/access-activation.types';
import { validateLoginCredentials } from './loginValidation';
import { passwordChangePayload } from './passwordChangeValidation';

export function validateAccessActivation(token: string, draft: AccessActivationDraft): void {
  if (!token || token.length > 512) throw new Error('Abra um link de convite válido.');
  const errors = validateLoginCredentials({ email: draft.email, password: draft.firebasePassword });
  if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
  passwordChangePayload({ currentPassword: draft.firebasePassword, newPassword: draft.newPassword, confirmation: draft.confirmation });
}
