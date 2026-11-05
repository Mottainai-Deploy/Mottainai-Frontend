import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { login, logout } from '../src/services/authService';
import { apiRequest, setApiSession } from '../src/services/apiClient';

const API = 'https://api.example.invalid/api/v1';
const FIREBASE = 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword';
const session = {
  accessToken: 'synthetic-operational-access', refreshToken: 'synthetic-operational-refresh',
  tokenType: 'Bearer', expiresIn: 3600, refreshExpiresIn: 86400,
};
const profile = { id: 7, name: 'Pessoa de teste', email: 'pessoa@example.com', active: true, storeId: 4 };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json' },
});

beforeEach(() => {
  vi.stubEnv('VITE_API_BASE_URL', API);
  vi.stubEnv('VITE_FIREBASE_AUTH_URL', FIREBASE);
  vi.stubEnv('VITE_FIREBASE_API_KEY', 'synthetic-public-client-key');
  vi.stubGlobal('fetch', vi.fn());
  setApiSession(null);
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); setApiSession(null); });

describe('contrato de login Firebase e autorização operacional', () => {
  it.each(['ADMINISTRATOR', 'MANAGER', 'SUPERVISOR', 'OPERATOR'])(
    'autentica %s sem enviar a senha para a API operacional', async role => {
      vi.mocked(fetch).mockResolvedValueOnce(json({ idToken: 'synthetic-firebase-id-token' }))
        .mockResolvedValueOnce(json(session)).mockResolvedValueOnce(json({ ...profile, role }));

      const result = await login({ email: ' pessoa@example.com ', password: ' senha de acesso ' });

      expect(result).toEqual({ token: session.accessToken, user: { id: '7', name: profile.name, email: profile.email } });
      const calls = vi.mocked(fetch).mock.calls;
      expect(calls).toHaveLength(3);
      expect(String(calls[0][0])).toContain(FIREBASE);
      expect(JSON.parse(String(calls[0][1]?.body))).toEqual({
        email: profile.email, password: ' senha de acesso ', returnSecureToken: true,
      });
      expect(calls[1][0]).toBe(`${API}/auth/firebase`);
      expect(JSON.parse(String(calls[1][1]?.body))).toEqual({ firebaseIdToken: 'synthetic-firebase-id-token' });
      expect(new Headers(calls[1][1]?.headers).has('Authorization')).toBe(false);
      expect(calls[2][0]).toBe(`${API}/auth/profile`);
      expect(new Headers(calls[2][1]?.headers).get('Authorization')).toBe(`Bearer ${session.accessToken}`);
    },
  );

  it('mantém a falha de senha na etapa Firebase e não consulta a API', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(json({ error: { message: 'INVALID_LOGIN_CREDENTIALS' } }, 400));
    await expect(login({ email: profile.email, password: 'senha inválida' })).rejects.toThrow(/senha Firebase/);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it.each([401, 403])('distingue recusa operacional %s de senha inválida e não libera sessão', async status => {
    vi.mocked(fetch).mockResolvedValueOnce(json({ idToken: 'synthetic-firebase-id-token' }))
      .mockResolvedValueOnce(json({ message: 'Invalid Firebase identity or password' }, status));
    await expect(login({ email: profile.email, password: 'senha válida' })).rejects.toThrow(/e-mail e senha foram confirmados/);
    await expect(apiRequest('/products')).rejects.toThrow(/Entre na sua conta/);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('encerra a tentativa se o perfil e a renovação forem recusados, mesmo após emitir os tokens', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(json({ idToken: 'synthetic-firebase-id-token' }))
      .mockResolvedValueOnce(json(session)).mockResolvedValueOnce(json({ message: 'Bad credentials' }, 401))
      .mockResolvedValueOnce(json({ message: 'Bad credentials' }, 401));
    await expect(login({ email: profile.email, password: 'senha válida' })).rejects.toThrow(/perfil de acesso/);
    await expect(apiRequest('/products')).rejects.toThrow(/Entre na sua conta/);
  });

  it('mantém a mensagem de indisponibilidade do servidor em vez de atribuir falha ao cadastro', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(json({ idToken: 'synthetic-firebase-id-token' }))
      .mockResolvedValueOnce(json({}, 503));
    await expect(login({ email: profile.email, password: 'senha válida' })).rejects.toThrow(/temporariamente indisponível/);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it.each(['', '   '])('rejeita token Firebase vazio antes de chamar a API', async idToken => {
    vi.mocked(fetch).mockResolvedValueOnce(json({ idToken }));
    await expect(login({ email: profile.email, password: 'senha válida' })).rejects.toThrow(/token válido/);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('não libera um perfil inativo', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(json({ idToken: 'synthetic-firebase-id-token' }))
      .mockResolvedValueOnce(json(session)).mockResolvedValueOnce(json({ ...profile, active: false }));
    await expect(login({ email: profile.email, password: 'senha válida' })).rejects.toThrow(/inativo/);
    await expect(apiRequest('/products')).rejects.toThrow(/Entre na sua conta/);
  });

  it('ignora uma identidade que chega depois do logout', async () => {
    let resolveIdentity!: (value: Response) => void;
    vi.mocked(fetch).mockReturnValueOnce(new Promise(resolve => { resolveIdentity = resolve; }));
    const pending = login({ email: profile.email, password: 'senha válida' });
    await logout();
    resolveIdentity(json({ idToken: 'synthetic-firebase-id-token' }));
    await expect(pending).rejects.toThrow(/substituída/);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
