import { beforeEach, expect, it, vi } from 'vitest';
import { apiRequest, ApiRequestError } from '../src/services/apiClient';
import { getInventory } from '../src/services/inventoryService';
import { getDisposals } from '../src/services/disposalService';
import { getInventoryMovements } from '../src/services/inventoryMovementService';
import { getTransfers, getTransferContext } from '../src/services/transferService';
import { getStores } from '../src/services/storeService';

vi.mock('../src/services/apiClient', async (importOriginal) => ({ ...await importOriginal<typeof import('../src/services/apiClient')>(), apiRequest: vi.fn() }));
vi.mock('../src/services/storeService', () => ({ getStores: vi.fn() }));
const profile = { id: 7, name: 'Teste', email: '', role: 'Administrator', storeId: 10, active: true };
beforeEach(() => {
  vi.mocked(getStores).mockReset().mockResolvedValue([]);
  vi.mocked(apiRequest).mockReset().mockImplementation(async (path) => path === '/auth/profile' ? profile : []);
});

it('consulta estoque e históricos com a loja derivada do perfil, inclusive para administrador', async () => {
  const range = { from: '2026-11-01', to: '2026-11-01' };
  await getInventory(); await getDisposals(range); await getInventoryMovements(range); await getTransfers(range);
  const paths = vi.mocked(apiRequest).mock.calls.map(([path]) => path).filter((path) => path !== '/auth/profile');
  expect(paths).toHaveLength(4);
  for (const path of paths) expect(new URL(path, 'http://test.invalid').searchParams.get('storeId')).toBe('10');
});

it('trata somente 403 da lista de lojas como indisponibilidade de listagem', async () => {
  vi.mocked(getStores).mockRejectedValueOnce(new ApiRequestError('Sem permissão para listar', 403));
  vi.mocked(apiRequest).mockImplementation(async (path) => {
    if (path === '/auth/profile') return profile;
    throw new ApiRequestError('Sem permissão para listar', 403);
  });
  expect(await getTransferContext()).toEqual({ profile, stores: [], storeListAvailable: false });
  vi.mocked(getStores).mockRejectedValueOnce(new ApiRequestError('Falha do servidor', 500));
  vi.mocked(apiRequest).mockImplementation(async (path) => {
    if (path === '/auth/profile') return profile;
    throw new ApiRequestError('Falha do servidor', 500);
  });
  await expect(getTransferContext()).rejects.toThrow('Falha do servidor');
});
