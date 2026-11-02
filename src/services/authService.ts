import type { LoginCredentials, LoginResponse } from '@/types/auth.types';
import { validateAuthProfile, validateAuthSession } from '@/utils/authResponseValidation';
import { apiRequest, setApiSession, endApiSession } from './apiClient';
import { getFirebaseIdToken } from './firebaseAuthService';
import { getCurrentProfile } from './profileService';

let authenticationAttempt = 0;

export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  const attempt = ++authenticationAttempt;
  setApiSession(null);
  const checkAttempt = () => {
    if (attempt !== authenticationAttempt) throw new Error('Esta tentativa de acesso foi substituída.');
  };
  try {
    const firebaseIdToken = await getFirebaseIdToken(credentials);
    checkAttempt();
    const response = await apiRequest<unknown>('/auth/firebase', {
      method: 'POST', authenticated: false, body: { firebaseIdToken },
    });
    checkAttempt();
    const session = validateAuthSession(response);
    setApiSession(session);
    const profile = await getCurrentProfile();
    checkAttempt();
    return { token: session.accessToken, user: validateAuthProfile(profile) };
  } catch (error) {
    if (attempt === authenticationAttempt) setApiSession(null);
    throw error;
  }
}

export async function logout(): Promise<void> {
  authenticationAttempt += 1;
  return endApiSession();
}
