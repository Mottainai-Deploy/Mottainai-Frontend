import type { LoginCredentials, LoginResponse } from '@/types/auth.types';
import { validateAuthProfile, validateAuthSession } from '@/utils/authResponseValidation';
import { ApiRequestError, apiRequest, setApiSession, endApiSession } from './apiClient';
import { getFirebaseIdToken } from './firebaseAuthService';
import { getCurrentProfile } from './profileService';

let authenticationAttempt = 0;

export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  const attempt = ++authenticationAttempt;
  let stage: 'identity' | 'session' | 'profile' = 'identity';
  setApiSession(null);
  const checkAttempt = () => {
    if (attempt !== authenticationAttempt) throw new Error('Esta tentativa de acesso foi substituída.');
  };
  try {
    const firebaseIdToken = await getFirebaseIdToken(credentials);
    checkAttempt();
    stage = 'session';
    const response = await apiRequest<unknown>('/auth/firebase', {
      method: 'POST', authenticated: false, body: { firebaseIdToken },
    });
    checkAttempt();
    const session = validateAuthSession(response);
    setApiSession(session);
    stage = 'profile';
    const profile = await getCurrentProfile();
    checkAttempt();
    return { token: session.accessToken, user: validateAuthProfile(profile) };
  } catch (error) {
    if (attempt === authenticationAttempt) setApiSession(null);
    // Uma recusa após o Firebase não significa que a senha de acesso estava errada.
    // O servidor continua responsável por validar vínculo, ativação e permissões.
    if (stage !== 'identity' && error instanceof ApiRequestError
      && (error.status === 401 || error.status === 403)) {
      throw new Error(
        stage === 'session'
          ? 'Seu e-mail e senha foram confirmados, mas não foi possível validar seu acesso ao sistema. Solicite a revisão do seu cadastro.'
          : 'Não foi possível confirmar seu perfil de acesso. Entre novamente e, se o problema continuar, solicite a revisão do seu cadastro.',
        { cause: error },
      );
    }
    throw error;
  }
}

export async function logout(): Promise<void> {
  authenticationAttempt += 1;
  return endApiSession();
}
