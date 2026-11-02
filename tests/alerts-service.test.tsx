import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { getAlert, getStoreAlerts, updateAlertStatus } from '../src/services/alertService';
import { decideSuggestedAction, getSuggestedActions } from '../src/services/suggestedActionService';
import { setApiSession } from '../src/services/apiClient';
import { validateAlertStatus, validateSuggestedDecision } from '../src/utils/alertPresentation';
beforeEach(() => {
  vi.stubEnv('VITE_API_BASE_URL', 'http://api.example.invalid/api/v1');
  setApiSession({ accessToken: 'synthetic-test', refreshToken: 'synthetic-test', tokenType: 'Bearer', expiresIn: 3600, refreshExpiresIn: 86400 });
  vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url) => new Response(JSON.stringify(String(url).endsWith('/auth/profile') ? { storeId: 10 } : {}), { status: 200, headers: { 'Content-Type': 'application/json' } })));
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); setApiSession(null); });
it('obtém a loja do perfil e envia storeId explicitamente na consulta', async () => {
  await getStoreAlerts();
  const calls = vi.mocked(fetch).mock.calls;
  expect(String(calls[0][0])).toBe('http://api.example.invalid/api/v1/auth/profile');
  const url = new URL(String(calls[1][0])); expect(url.pathname).toBe('/api/v1/alerts'); expect(url.searchParams.get('storeId')).toBe('10');
});
it('consulta detalhe/sugestões e registra status/decisão nas rotas exatas, sem executar a sugestão', async () => {
  await getAlert('11'); await getSuggestedActions('11'); await updateAlertStatus('11', 'ANALYZING'); await decideSuggestedAction(22, 'APPROVED');
  const calls = vi.mocked(fetch).mock.calls;
  expect(calls.map(([url]) => new URL(String(url)).pathname)).toEqual(['/api/v1/alerts/11', '/api/v1/alerts/11/suggested-actions', '/api/v1/alerts/11/status', '/api/v1/suggested-actions/22/decision']);
  expect(calls[2][1]?.method).toBe('PATCH'); expect(JSON.parse(String(calls[2][1]?.body))).toEqual({ status: 'ANALYZING' });
  expect(calls[3][1]?.method).toBe('POST'); expect(JSON.parse(String(calls[3][1]?.body))).toEqual({ decision: 'APPROVED' });
});
it('bloqueia identificadores e estados fora do contrato antes de enviar', async () => {
  await expect(getAlert('../other')).rejects.toThrow(/identificador/);
  await expect(getSuggestedActions('0')).rejects.toThrow(/identificador/);
  await expect(decideSuggestedAction(-2, 'APPROVED')).rejects.toThrow(/identificador/);
  expect(() => validateAlertStatus('__proto__')).toThrow(/status/);
  expect(() => validateSuggestedDecision('EXECUTED')).toThrow(/aprovar ou rejeitar/);
  expect(fetch).not.toHaveBeenCalled();
});
