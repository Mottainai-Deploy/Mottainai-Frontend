import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { executeSuggestedAction, getExecutionContext } from '../src/services/suggestedActionService';
import { ApiRequestError, setApiSession } from '../src/services/apiClient';
import { getCurrentProfile } from '../src/services/profileService';
import { getProducts } from '../src/services/productService';
import { getInventoryRows } from '../src/services/inventoryService';
import { getSuppliers } from '../src/services/supplierService';
import { getStores } from '../src/services/storeService';
vi.mock('../src/services/profileService', () => ({ getCurrentProfile: vi.fn() }));
vi.mock('../src/services/productService', () => ({ getProducts: vi.fn() }));
vi.mock('../src/services/inventoryService', () => ({ getInventoryRows: vi.fn() }));
vi.mock('../src/services/supplierService', () => ({ getSuppliers: vi.fn() }));
vi.mock('../src/services/storeService', () => ({ getStores: vi.fn() }));
const result = { suggestedAction: { id: 22, alertId: 11, actionType: 'CREATE_TRANSFER', status: 'EXECUTED' }, entityType: 'transfer', entityId: 99 };
beforeEach(() => {
  vi.stubEnv('VITE_API_BASE_URL', 'http://api.example.invalid/api/v1');
  setApiSession({ accessToken: 'synthetic-test', refreshToken: 'synthetic-test', tokenType: 'Bearer', expiresIn: 3600, refreshExpiresIn: 86400 });
  vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => new Response(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json' } })));
  vi.mocked(getCurrentProfile).mockResolvedValue({ id: 7, name: 'Pessoa', email: null, role: 'Cargo', storeId: 10, active: true });
  vi.mocked(getProducts).mockResolvedValue([]); vi.mocked(getInventoryRows).mockResolvedValue([]); vi.mocked(getSuppliers).mockResolvedValue([]); vi.mocked(getStores).mockResolvedValue([]);
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); setApiSession(null); });
it('envia o contrato da execução e a chave recebida, sem chamar rotas de criação isoladas', async () => {
  const body = { destinationStoreId: 20, observation: '', items: [{ batchId: 5, quantity: 1 }] };
  expect(await executeSuggestedAction(22, body, 'same-execution-key')).toEqual(result);
  const calls = vi.mocked(fetch).mock.calls; expect(calls).toHaveLength(1);
  expect(String(calls[0][0])).toBe('http://api.example.invalid/api/v1/suggested-actions/22/execute'); expect(calls[0][1]?.method).toBe('POST');
  expect(JSON.parse(String(calls[0][1]?.body))).toEqual(body); expect(new Headers(calls[0][1]?.headers).get('Idempotency-Key')).toBe('same-execution-key');
});
it('não declara sucesso para resposta sem confirmação ou identificador válido', async () => {
  vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ ...result, suggestedAction: { id: 22, status: 'PENDING' } }), { status: 200 }));
  await expect(executeSuggestedAction(22, { items: [{ batchId: 5, quantity: 1 }] }, 'key')).rejects.toThrow(/não confirmou/);
  vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ ...result, entityId: 0 }), { status: 200 }));
  await expect(executeSuggestedAction(22, { items: [{ batchId: 5, quantity: 1 }] }, 'key')).rejects.toThrow(/identificador/);
});
it('bloqueia ausência de itens ou chave antes de enviar', async () => {
  await expect(executeSuggestedAction(22, { items: [] }, 'key')).rejects.toThrow(/item/);
  await expect(executeSuggestedAction(22, { items: [{ batchId: 5, quantity: 1 }] }, '')).rejects.toThrow(/identificação/);
  expect(fetch).not.toHaveBeenCalled();
});
it('consulta somente as opções exigidas pelo tipo da operação', async () => {
  const controller = new AbortController();
  await getExecutionContext('CREATE_PURCHASE_ORDER', controller.signal);
  expect(getProducts).toHaveBeenCalledWith(controller.signal); expect(getSuppliers).toHaveBeenCalledWith(controller.signal); expect(getInventoryRows).not.toHaveBeenCalled(); expect(getStores).not.toHaveBeenCalled();
  vi.mocked(getProducts).mockClear(); vi.mocked(getSuppliers).mockClear();
  await getExecutionContext('CREATE_DISPOSAL', controller.signal);
  expect(getInventoryRows).toHaveBeenCalledWith(controller.signal); expect(getProducts).not.toHaveBeenCalled(); expect(getSuppliers).not.toHaveBeenCalled();
});
it('distingue proibição de listar lojas de falhas da API', async () => {
  vi.mocked(getStores).mockRejectedValueOnce(new ApiRequestError('Sem permissão', 403));
  expect((await getExecutionContext('CREATE_TRANSFER')).storeListAvailable).toBe(false);
  vi.mocked(getStores).mockRejectedValueOnce(new ApiRequestError('Indisponível', 500));
  await expect(getExecutionContext('CREATE_TRANSFER')).rejects.toThrow(/indisponível/i);
});
