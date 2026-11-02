import { jwtDecode } from 'jwt-decode';
import type { FirebaseIdentitySummary } from '@/types/access-activation.types';
import { isValidEmailAddress } from './emailValidation';

// Apenas diagnóstico da identidade após recusa da API; nunca autoriza acesso.
export function firebaseIdentitySummary(token: string): FirebaseIdentitySummary | null {
  try {
    const payload = jwtDecode<{ email?: unknown; sub?: unknown }>(token);
    if (typeof payload.email !== 'string' || payload.email.length > 254 || !isValidEmailAddress(payload.email)
      || typeof payload.sub !== 'string' || !payload.sub || payload.sub.length > 128) return null;
    return { email: payload.email, uid: payload.sub };
  } catch { return null; }
}
