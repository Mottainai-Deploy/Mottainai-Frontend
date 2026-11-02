import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, renderHook, screen } from '@testing-library/react';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import * as authService from '@/services/authService';
import { AuthProvider } from '@/context/AuthProvider';
import { PrivateRoute } from '@/pages/PrivateRoute';
import { useAuth } from '@/hooks/useAuth';
import { useMinimumLoadingVisibility } from '@/hooks/useMinimumLoadingVisibility';
import Loading from '@/components/Loading';

vi.mock('@/services/authService', () => ({
  login: vi.fn(),
  logout: vi.fn().mockResolvedValue(undefined),
}));

const TOKEN_KEY = '@App:token';
const loginMock = vi.mocked(authService.login);

function encodeBase64Url(value: object): string {
  return btoa(JSON.stringify(value))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function createToken(exp = Math.floor(Date.now() / 1000) + 3600): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    sub: 'test-user-id',
    name: 'Test User',
    email: 'test@example.com',
    exp,
  };

  return `${encodeBase64Url(header)}.${encodeBase64Url(payload)}.test-signature`;
}

function SessionLogin({ children }: { children: ReactNode }) {
  const { login, isAuthenticated } = useAuth();
  useEffect(() => {
    void login({ email: 'test@example.com', password: 'password' });
  }, [login]);
  return isAuthenticated ? children : null;
}

function renderProtectedRoute(startSession = false) {
  const router = (
    <MemoryRouter initialEntries={['/private']}>
      <Routes>
        <Route path="/login" element={<p>Login público</p>} />
        <Route element={<PrivateRoute />}>
          <Route path="/private" element={<p>Conteúdo protegido</p>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
  return render(
    <AuthProvider>
      {startSession ? <SessionLogin>{router}</SessionLogin> : router}
    </AuthProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  loginMock.mockReset();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

it('preserva o título da página de destino ao encerrar o carregamento', () => {
  document.title = 'Sistema Mottainai';
  const { unmount } = render(<Loading />);
  expect(document.title).toBe('Carregando | Mottainai');
  document.title = 'Página não encontrada | Mottainai';
  unmount();
  expect(document.title).toBe('Página não encontrada | Mottainai');
});

describe('R5 — sessão mantida em memória', () => {
  it('descarta tokens locais antigos ao iniciar a aplicação', () => {
    localStorage.setItem(TOKEN_KEY, JSON.stringify({ _versao: 1, token: createToken() }));

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    expect(result.current.isAuthenticated).toBe(false);
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });
});

describe('R8 — validação antes do service', () => {
  it('impede o envio ao service quando o e-mail é inválido', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await act(async () => {
      await result.current.login({ email: 'inválido', password: 'senha-segura' });
    });

    expect(loginMock).not.toHaveBeenCalled();
    expect(result.current.error).toBe('Informe um e-mail válido.');
  });

  it('envia ao service apenas as credenciais já sanitizadas', async () => {
    loginMock.mockResolvedValue({ token: createToken() });
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await act(async () => {
      await result.current.login({ email: ' test@example.com ', password: ' senha ' });
    });

    expect(loginMock).toHaveBeenCalledWith({ email: 'test@example.com', password: ' senha ' });
    expect(result.current.isAuthenticated).toBe(true);
  });
});

describe('R9 — PrivateRoute', () => {
  it('redireciona quem não está autenticado para o login', async () => {
    renderProtectedRoute();

    expect(await screen.findByText('Login público')).toBeTruthy();
    expect(screen.queryByText('Conteúdo protegido')).toBeNull();
  });

  it('libera a rota quando há uma sessão válida no Context', async () => {
    loginMock.mockResolvedValue({ token: createToken() });
    renderProtectedRoute(true);

    expect(await screen.findByText('Conteúdo protegido')).toBeTruthy();
    expect(screen.queryByText('Login público')).toBeNull();
  });
});

describe('useMinimumLoadingVisibility', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('mantém o indicador visível pelo tempo mínimo após o carregamento', () => {
    const { result, rerender } = renderHook(
      ({ isLoading }: { isLoading: boolean }) => useMinimumLoadingVisibility(isLoading),
      { initialProps: { isLoading: false } },
    );

    expect(result.current).toBe(false);

    rerender({ isLoading: true });
    expect(result.current).toBe(true);

    rerender({ isLoading: false });
    expect(result.current).toBe(true);

    act(() => vi.advanceTimersByTime(499));
    expect(result.current).toBe(true);

    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe(false);
  });

  it('reinicia o período mínimo quando um novo carregamento começa antes do anterior terminar', () => {
    const { result, rerender } = renderHook(
      ({ isLoading }: { isLoading: boolean }) => useMinimumLoadingVisibility(isLoading),
      { initialProps: { isLoading: true } },
    );

    rerender({ isLoading: false });
    act(() => vi.advanceTimersByTime(300));
    rerender({ isLoading: true });
    rerender({ isLoading: false });

    act(() => vi.advanceTimersByTime(499));
    expect(result.current).toBe(true);

    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe(false);
  });
});
