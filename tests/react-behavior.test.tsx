import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, renderHook, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import * as authService from '@/services/authService';
import * as historicalMetricService from '@/services/historicalMetricService';
import { AuthProvider } from '@/context/AuthProvider';
import { PrivateRoute } from '@/pages/PrivateRoute';
import { useAuth } from '@/hooks/useAuth';
import { useHistoricalMetrics } from '@/hooks/useHistoricalMetrics';
import { useMinimumLoadingVisibility } from '@/hooks/useMinimumLoadingVisibility';
import type { HistoricalMetric } from '@/types/historical-metric.types';

vi.mock('@/services/authService', () => ({
  isMockAuthenticationEnabled: true,
  login: vi.fn(),
}));

vi.mock('@/services/historicalMetricService', () => ({
  getHistoricalMetrics: vi.fn(),
}));

const TOKEN_KEY = '@App:token';
const loginMock = vi.mocked(authService.login);
const metricsMock = vi.mocked(historicalMetricService.getHistoricalMetrics);

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

function renderProtectedRoute() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/private']}>
        <Routes>
          <Route path="/login" element={<p>Login público</p>} />
          <Route element={<PrivateRoute />}>
            <Route path="/private" element={<p>Conteúdo protegido</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  loginMock.mockReset();
  metricsMock.mockReset();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('R3 — useHistoricalMetrics', () => {
  it('mostra carregamento e depois entrega os dados', async () => {
    const metrics: HistoricalMetric[] = [{ date: '2026-10-01', value: 42 }];
    metricsMock.mockResolvedValue(metrics);

    const { result } = renderHook(() => useHistoricalMetrics());

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => {
      expect(result.current).toEqual({ data: metrics, isLoading: false, error: null });
    });
  });

  it('expõe a falha de carregamento no estado do hook', async () => {
    metricsMock.mockRejectedValue(new Error('Falha simulada'));

    const { result } = renderHook(() => useHistoricalMetrics());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Falha simulada');
    });
  });

  it('aborta a consulta quando o componente desmonta', () => {
    let requestSignal: AbortSignal | undefined;
    metricsMock.mockImplementation((signal) => {
      requestSignal = signal;
      return new Promise<HistoricalMetric[]>(() => undefined);
    });

    const { unmount } = renderHook(() => useHistoricalMetrics());

    expect(requestSignal?.aborted).toBe(false);
    unmount();
    expect(requestSignal?.aborted).toBe(true);
  });
});

describe('R5 — sessão local versionada', () => {
  it('migra token legado válido para o schema _versao 1', () => {
    const token = createToken();
    localStorage.setItem(TOKEN_KEY, JSON.stringify(token));

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.id).toBe('test-user-id');
    expect(JSON.parse(localStorage.getItem(TOKEN_KEY) ?? 'null')).toEqual({ _versao: 1, token });
  });

  it('descarta schema desconhecido sem autenticar a pessoa', () => {
    localStorage.setItem(TOKEN_KEY, JSON.stringify({ _versao: 2, token: createToken() }));

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    expect(result.current.isAuthenticated).toBe(false);
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it('descarta token expirado do schema atual', () => {
    localStorage.setItem(
      TOKEN_KEY,
      JSON.stringify({ _versao: 1, token: createToken(Math.floor(Date.now() / 1000) - 60) }),
    );

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
    localStorage.setItem(TOKEN_KEY, JSON.stringify({ _versao: 1, token: createToken() }));
    renderProtectedRoute();

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
