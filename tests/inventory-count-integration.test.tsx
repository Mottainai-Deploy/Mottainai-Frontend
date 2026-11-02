import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import InventoryCountEditor from '../src/components/InventoryCountEditor';
import { getInventoryCount, finishInventoryCount, saveInventoryCountItem, deleteInventoryCountItem } from '../src/services/inventoryCountService';
import { getInventoryRows } from '../src/services/inventoryService';
import { toCountItemPayload } from '../src/utils/inventoryValidation';
import type { InventoryCount } from '../src/types/inventory-count-api.types';
import type { InventoryRow } from '../src/types/inventory-api.types';

vi.mock('../src/services/inventoryCountService', () => ({
  getInventoryCount: vi.fn(), finishInventoryCount: vi.fn(), saveInventoryCountItem: vi.fn(), createInventoryCount: vi.fn(),
  deleteInventoryCountItem: vi.fn(),
}));
vi.mock('../src/services/inventoryService', () => ({ getInventoryRows: vi.fn() }));

const count: InventoryCount = { id: 1, storeId: 10, employeeId: 7, status: 'IN_PROGRESS', startedAt: '2026-11-01T12:00:00Z', finishedAt: null, observation: null,
  items: [{ id: 3, inventoryId: 2, systemQuantity: 4, countedQuantity: 3, difference: -1, observation: null }] };
const inventory: InventoryRow = { id: 2, storeId: 10, batchId: 5, inventoryType: 'NORMAL', currentQuantity: 4, minimumQuantity: 1, maximumQuantity: null,
  location: 'Depósito', version: 0, reactivated: false, productId: 6, productName: 'Produto de teste', barcode: '123', unitMeasure: 'UN', batchCode: 'L1', expirationDate: '2027-01-01' };

beforeEach(() => {
  vi.mocked(getInventoryCount).mockResolvedValue(count);
  vi.mocked(getInventoryRows).mockResolvedValue([inventory]);
});
afterEach(cleanup);

it('remove um item somente após confirmação e nova consulta à contagem', async () => {
  vi.mocked(deleteInventoryCountItem).mockResolvedValue(undefined);
  mount();
  const remove = await screen.findByRole('button', { name: 'Remover item 2 da contagem' });
  await waitFor(() => expect((remove as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(remove);
  expect(deleteInventoryCountItem).not.toHaveBeenCalled();
  vi.mocked(getInventoryCount).mockResolvedValue({ ...count, items: [] });
  const confirm = await screen.findByRole('button', { name: 'Confirmar remoção do item' });
  fireEvent.click(confirm); fireEvent.click(confirm);
  await screen.findByText('Item removido da contagem. Nenhum saldo de estoque foi alterado.');
  expect(deleteInventoryCountItem).toHaveBeenCalledTimes(1);
  expect(deleteInventoryCountItem).toHaveBeenCalledWith('1', 3);
});

it('bloqueia novas ações quando a resposta de remoção é perdida', async () => {
  vi.mocked(deleteInventoryCountItem).mockReset().mockRejectedValue(new Error('Resposta perdida'));
  mount();
  const remove = await screen.findByRole('button', { name: 'Remover item 2 da contagem' });
  await waitFor(() => expect((remove as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(remove);
  fireEvent.click(await screen.findByRole('button', { name: 'Confirmar remoção do item' }));
  await screen.findByText('A remoção ainda não foi confirmada. Consulte o estado da contagem antes de continuar.');
  expect(screen.queryByRole('button', { name: 'Confirmar remoção do item' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Consultar estado da contagem' }));
  await screen.findByText('Estado da contagem atualizado.');
  expect(deleteInventoryCountItem).toHaveBeenCalledTimes(1);
});

function mount() {
  render(<MemoryRouter><InventoryCountEditor countId="1" onCreated={vi.fn()} /></MemoryRouter>);
}

describe('Contagem conectada: confirmação e perda de resposta', () => {
  it('exige revisão e só anuncia conclusão com resposta do servidor', async () => {
    const completed: InventoryCount = { ...count, status: 'COMPLETED', finishedAt: '2026-11-01T13:00:00Z' };
    vi.mocked(finishInventoryCount).mockResolvedValue(completed);
    mount();
    const review = await screen.findByRole('button', { name: 'Revisar finalização' });
    expect(screen.queryByRole('button', { name: 'Confirmar finalização e ajustar estoque' })).toBeNull();
    fireEvent.click(review);
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar finalização e ajustar estoque' }));
    await screen.findByText('Contagem concluída e ajustes confirmados pelo servidor.');
    expect(finishInventoryCount).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Revisar finalização' })).toBeNull();
  });

  it('bloqueia edição após falha de finalização e reconcilia com consulta ao servidor', async () => {
    vi.mocked(finishInventoryCount).mockRejectedValue(new Error('Resposta interrompida'));
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Revisar finalização' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar finalização e ajustar estoque' }));
    await screen.findByText('Resposta interrompida');
    await screen.findByText('A finalização ainda não foi confirmada. Consulte o estado da contagem antes de continuar.');
    expect(screen.queryByRole('button', { name: 'Confirmar finalização e ajustar estoque' })).toBeNull();
    vi.mocked(getInventoryCount).mockResolvedValue({ ...count, status: 'COMPLETED' });
    fireEvent.click(screen.getByRole('button', { name: 'Consultar estado da contagem' }));
    await screen.findByText('Estado da contagem atualizado.');
    expect(screen.queryByText('A finalização ainda não foi confirmada. Consulte o estado da contagem antes de continuar.')).toBeNull();
    expect(finishInventoryCount).toHaveBeenCalledTimes(1);
  });

  it('atualiza um item existente para zero sem duplicá-lo', async () => {
    vi.mocked(saveInventoryCountItem).mockResolvedValue({ ...count.items[0], countedQuantity: 0, difference: -4 });
    mount();
    const edit = await screen.findByRole('button', { name: /Editar quantidade/ });
    await waitFor(() => expect((edit as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(edit);
    fireEvent.change(screen.getByLabelText('Quantidade física *'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar quantidade' }));
    await screen.findByText('Quantidade física salva na contagem.');
    expect(saveInventoryCountItem).toHaveBeenCalledWith('1', { inventoryId: '2', quantity: '0', observation: '' }, 3);
    expect(screen.getByText(/1 item registrado/)).toBeTruthy();
  });

  it('mantém a chave de finalização ao tentar novamente após consultar uma contagem ainda aberta', async () => {
    vi.mocked(finishInventoryCount).mockReset().mockRejectedValueOnce(new Error('Resposta perdida')).mockResolvedValueOnce({ ...count, status: 'COMPLETED' });
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Revisar finalização' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar finalização e ajustar estoque' }));
    await screen.findByText('Resposta perdida');
    fireEvent.click(screen.getByRole('button', { name: 'Consultar estado da contagem' }));
    await screen.findByText('Estado da contagem atualizado.');
    fireEvent.click(screen.getByRole('button', { name: 'Revisar finalização' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar finalização e ajustar estoque' }));
    await screen.findByText('Contagem concluída e ajustes confirmados pelo servidor.');
    const calls = vi.mocked(finishInventoryCount).mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls[0][1]).toBeTruthy();
    expect(calls[1][1]).toBe(calls[0][1]);
  });
});

it('valida precisão, sinal e identificação antes do envio de quantidades', () => {
  expect(toCountItemPayload({ inventoryId: '2', quantity: '0', observation: ' teste ' })).toEqual({ inventoryId: 2, countedQuantity: 0, observation: 'teste' });
  expect(toCountItemPayload({ inventoryId: '2', quantity: '1,125', observation: '' }).countedQuantity).toBe(1.125);
  for (const quantity of ['-1', 'NaN', '1000000000', '0.0001']) {
    expect(() => toCountItemPayload({ inventoryId: '2', quantity, observation: '' })).toThrow();
  }
  expect(() => toCountItemPayload({ inventoryId: '9007199254740992', quantity: '1', observation: '' })).toThrow();
});
