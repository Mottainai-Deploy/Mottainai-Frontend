import type { LoginCredentials } from '@/types/auth.types';
import { sanitizeLoginCredentials, validateLoginCredentials } from '@/utils/loginValidation';
import { firebaseErrorMessage } from '@/utils/apiErrorMessages';

export async function getFirebaseIdToken(credentials: LoginCredentials): Promise<string> {
  try {
    const errors = validateLoginCredentials(credentials);
    if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
    const clean = sanitizeLoginCredentials(credentials);
    const url = import.meta.env.VITE_FIREBASE_AUTH_URL as string | undefined;
    const key = import.meta.env.VITE_FIREBASE_API_KEY as string | undefined;
    if (!url || !key) throw new Error('O acesso Firebase ainda não foi configurado neste ambiente.');
    const response = await fetch(`${url}?key=${encodeURIComponent(key)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: clean.email, password: clean.password, returnSecureToken: true }),
    });
    const data: unknown = await response.json();
    if (!response.ok) throw new Error(firebaseErrorMessage(data));
    if (typeof data !== 'object' || data === null || !('idToken' in data) || typeof data.idToken !== 'string') {
      throw new Error('A resposta de autenticação não contém um token válido.');
    }
    return data.idToken;
  } catch (error) {
    throw new Error(error instanceof TypeError ? 'Não foi possível acessar a autenticação Firebase.'
      : error instanceof SyntaxError ? 'Não foi possível interpretar a resposta da autenticação Firebase.'
      : error instanceof Error ? error.message : 'Falha na autenticação.', { cause: error });
  }
}
