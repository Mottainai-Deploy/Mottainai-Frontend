import { useReducer, useMemo, useCallback, useEffect, useRef } from 'react';
import { jwtDecode } from 'jwt-decode';
import { AuthContext } from './AuthContext';
import * as authService from '@/services/authService';
import type {
  AuthContextData,
  DecodedToken,
  LoginCredentials,
  AuthProviderProps,
  AuthAction,
  AuthState,
  User,
} from '@/types/auth.types';
import { sanitizeLoginCredentials, validateLoginCredentials } from '@/utils/loginValidation';

const TOKEN_KEY = '@App:token';

// Decodifica o token e obtém os dados básicos da sessão.
function decodeUserFromToken(token: string): User | null {
  try {
    const decoded = jwtDecode<DecodedToken>(token);
    if (decoded.exp * 1000 < Date.now()) return null;

    return {
      id: decoded.sub,
      name: decoded.name ?? '',
      email: decoded.email ?? '',
    };
  } catch {
    return null;
  }
}

const initialAuthState: AuthState = {
  notice: null,
  token: null,
  user: null,
  isLoggingIn: false,
  error: null,
};

function discardStoredToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // O estado inicial sem autenticação continua seguro se o armazenamento estiver bloqueado.
  }
}

function getInitialAuthState(): AuthState {
  discardStoredToken();
  return initialAuthState;
}

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'login-started':
      return { ...initialAuthState, isLoggingIn: true };
    case 'login-succeeded':
      return { token: action.token, user: action.user, isLoggingIn: false, error: null, notice: null };
    case 'login-failed':
      return { ...state, isLoggingIn: false, error: action.error };
    case 'logged-out':
      return { ...initialAuthState, notice: action.notice ?? null };
    case 'error-cleared':
      return { ...state, error: null };
  }
}

// Compartilha o estado de autenticação com a aplicação.
export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, dispatch] = useReducer(authReducer, undefined, getInitialAuthState);
  const operation = useRef({ revision: 0, pending: false });

  // Valida as credenciais e inicia a sessão retornada pelo servidor.
  const login = useCallback(async (credentials: LoginCredentials) => {
    if (operation.current.pending) return;
    const revision = ++operation.current.revision;
    operation.current.pending = true;
    dispatch({ type: 'login-started' });

    try {
      const errors = validateLoginCredentials(credentials);
      if (Object.keys(errors).length > 0) {
        throw new Error(Object.values(errors)[0] ?? 'Revise os dados de acesso.');
      }
      const { token, user } = await authService.login(sanitizeLoginCredentials(credentials));
      if (revision !== operation.current.revision) return;
      const decodedUser = user ?? decodeUserFromToken(token);

      if (!decodedUser) {
        throw new Error('Não foi possível validar o token recebido.');
      }

      dispatch({ type: 'login-succeeded', token, user: decodedUser });
    } catch (err) {
      if (revision !== operation.current.revision) return;
      const message = err instanceof Error ? err.message : 'Erro ao autenticar.';
      dispatch({ type: 'login-failed', error: message });
    } finally {
      if (revision === operation.current.revision) operation.current.pending = false;
    }
  }, []);

  // Encerra a sessão em memória e limpa tokens legados.
  const logout = useCallback(() => {
    const revision = ++operation.current.revision;
    operation.current.pending = false;
    void authService.logout().catch(() => {
      if (revision !== operation.current.revision) return;
      dispatch({ type: 'login-failed', error: 'A sessão local foi encerrada, mas não foi possível confirmar a revogação no servidor.' });
    });
    discardStoredToken();
    dispatch({ type: 'logged-out' });
  }, []);

  useEffect(() => {
    const onExpired = (event: Event) => {
      operation.current.revision += 1;
      operation.current.pending = false;
      discardStoredToken();
      const changed = 'detail' in event && typeof event.detail === 'object' && event.detail !== null
        && 'reason' in event.detail && event.detail.reason === 'password-changed';
      dispatch({ type: 'logged-out', ...(changed ? { notice: 'password-changed' as const } : {}) });
    };
    window.addEventListener('mottainai:session-expired', onExpired);
    const current = operation.current;
    return () => {
      current.revision += 1;
      current.pending = false;
      window.removeEventListener('mottainai:session-expired', onExpired);
    };
  }, []);

  const clearError = useCallback(() => dispatch({ type: 'error-cleared' }), []);

  // Mantém o valor derivado estável até a autenticação realmente mudar.
  const isAuthenticated = useMemo(
    () => !!authState.token && !!authState.user,
    [authState]
  );

  // Evita publicar um novo objeto no Context em cada renderização do Provider.
  const value = useMemo<AuthContextData>(
    () => ({
      user: authState.user,
      notice: authState.notice,
      token: authState.token,
      isAuthenticated,
      isLoggingIn: authState.isLoggingIn,
      error: authState.error,
      login,
      logout,
      clearError,
    }),
    [authState, isAuthenticated, login, logout, clearError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
