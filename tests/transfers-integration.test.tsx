import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import NewTransfer from '../src/pages/NewTransfer';
import TransferDetails from '../src/components/TransferDetails';
import { createTransfer, getTransfer, getTransferContext, receiveTransfer, updateTransferStatus } from '../src/services/transferService';
import { getCurrentProfile } from '../src/services/profileService';
import { getInventoryRows } from '../src/services/inventoryService';
import { allowedTransferActions, toTransferPayload } from '../src/utils/transferApiValidation';
import type { ApiTransfer } from '../src/types/transfer-api.types';
import type { InventoryRow } from '../src/types/inventory-api.types';

vi.mock('../src/services/transferService', () => ({ createTransfer: vi.fn(), getTransfer: vi.fn(), getTransferContext: vi.fn(), receiveTransfer: vi.fn(), updateTransferStatus: vi.fn() }));
vi.mock('../src/services/profileService', () => ({ getCurrentProfile: vi.fn() }));
vi.mock('../src/services/inventoryService', () => ({ getInventoryRows: vi.fn() }));

const profile = { id: 7, name: 'Pessoa de teste', email: 'teste@example.invalid', role: 'Administrator', active: true, storeId: 10 };
const row: InventoryRow = { id: 2, storeId: 10, batchId: 5, inventoryType: 'NORMAL', currentQuantity: 4, minimumQuantity: 1, maximumQuantity: null,
  location: 'Depósito', version: 0, reactivated: false, productId: 6, productName: 'Produto de teste', barcode: '123', unitMeasure: 'UN', batchCode: 'L1', expirationDate: '2027-01-01' };
const transfer: ApiTransfer = { id: 11, sourceStoreId: 10, destinationStoreId: 20, employeeId: 7, status: 'REQUESTED', observation: '', requestDate: '2026-11-01T12:00:00', completionDate: null, version: 0, items: [{ batchId: 5, transferredQuantity: 1 }] };

beforeEach(() => {
  vi.mocked(createTransfer).mockReset(); vi.mocked(receiveTransfer).mockReset(); vi.mocked(updateTransferStatus).mockReset();
  vi.mocked(getCurrentProfile).mockResolvedValue(profile);
  vi.mocked(getTransfer).mockResolvedValue(transfer);
  vi.mocked(getInventoryRows).mockResolvedValue([row]);
  vi.mocked(getTransferContext).mockResolvedValue({ profile, stores: [{ id: 10, name: 'Origem', active: true }, { id: 20, name: 'Destino', active: true }], storeListAvailable: true });
});
afterEach(cleanup);

async function newRequest() {
  render(<MemoryRouter><NewTransfer /></MemoryRouter>);
  await screen.findByRole('option', { name: /Destino — 20/ });
  await waitFor(() => expect((screen.getByLabelText('Loja de destino *').closest('fieldset') as HTMLFieldSetElement).disabled).toBe(false));
  fireEvent.change(screen.getByLabelText('Loja de destino *'), { target: { value: '20' } });
  fireEvent.change(screen.getByLabelText('Produto / lote 1'), { target: { value: '2' } });
  fireEvent.change(screen.getByLabelText('Quantidade do lote 1'), { target: { value: '1' } });
  fireEvent.click(screen.getByRole('button', { name: 'Revisar solicitação' }));
  await screen.findByRole('heading', { name: 'Revisar solicitação de transferência' });
}

it('solicita somente após revisão, sem executar envio ou recebimento', async () => {
  vi.mocked(createTransfer).mockResolvedValue(transfer);
  await newRequest();
  expect(createTransfer).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar solicitação' }));
  await screen.findByText('Transferência 11 confirmada pelo servidor.');
  expect(createTransfer).toHaveBeenCalledWith({ destinationStoreId: 20, observation: '', items: [{ batchId: 5, transferredQuantity: 1 }] }, expect.any(String));
  expect(updateTransferStatus).not.toHaveBeenCalled(); expect(receiveTransfer).not.toHaveBeenCalled();
});

it('preserva chave e payload quando a resposta de criação é perdida', async () => {
  vi.mocked(createTransfer).mockRejectedValueOnce(new Error('Resposta perdida')).mockResolvedValueOnce(transfer);
  await newRequest();
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar solicitação' }));
  await screen.findByText('Resposta perdida');
  fireEvent.click(screen.getByRole('button', { name: 'Reenviar a mesma solicitação' }));
  await screen.findByText('Transferência 11 confirmada pelo servidor.');
  const calls = vi.mocked(createTransfer).mock.calls;
  expect(calls).toHaveLength(2); expect(calls[1]).toEqual(calls[0]);
});

it('não repete um envio sem consultar o estado após falha de resposta', async () => {
  vi.mocked(updateTransferStatus).mockRejectedValue(new Error('Envio sem resposta'));
  render(<TransferDetails id="11" onChanged={vi.fn()} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Enviar transferência' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Confirmar operação' }));
  await screen.findByText(/Envio sem resposta/);
  expect(screen.queryByRole('button', { name: 'Enviar transferência' })).toBeNull();
  vi.mocked(getTransfer).mockResolvedValue({ ...transfer, status: 'IN_TRANSIT' });
  fireEvent.click(screen.getByRole('button', { name: 'Consultar estado da transferência' }));
  await screen.findByText('Estado atualizado pelo servidor.');
  await screen.findByRole('button', { name: 'Cancelar envio' });
  expect(updateTransferStatus).toHaveBeenCalledTimes(1);
});

it('recebimento é oferecido ao destino e preserva a chave numa nova tentativa reconciliada', async () => {
  vi.mocked(getCurrentProfile).mockResolvedValue({ ...profile, storeId: 20 });
  vi.mocked(getTransfer).mockResolvedValue({ ...transfer, status: 'IN_TRANSIT' });
  vi.mocked(receiveTransfer).mockRejectedValueOnce(new Error('Recebimento sem resposta')).mockResolvedValueOnce({ ...transfer, status: 'COMPLETED' });
  render(<TransferDetails id="11" onChanged={vi.fn()} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Confirmar recebimento' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Confirmar operação' }));
  await screen.findByText(/Recebimento sem resposta/);
  fireEvent.click(screen.getByRole('button', { name: 'Consultar estado da transferência' }));
  await screen.findByText('Estado atualizado pelo servidor.');
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar recebimento' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Confirmar operação' }));
  await screen.findByText('Operação confirmada pelo servidor.');
  const calls = vi.mocked(receiveTransfer).mock.calls;
  expect(calls).toHaveLength(2); expect(calls[1]).toEqual(calls[0]);
  expect(updateTransferStatus).not.toHaveBeenCalled();
});

it('cancela somente uma transferência em trânsito da origem após revisão', async () => {
  vi.mocked(getTransfer).mockResolvedValue({ ...transfer, status: 'IN_TRANSIT' });
  vi.mocked(updateTransferStatus).mockResolvedValue({ ...transfer, status: 'CANCELED' });
  render(<TransferDetails id="11" onChanged={vi.fn()} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Cancelar envio' }));
  expect(updateTransferStatus).not.toHaveBeenCalled();
  fireEvent.click(await screen.findByRole('button', { name: 'Confirmar operação' }));
  await screen.findByText('Operação confirmada pelo servidor.');
  expect(updateTransferStatus).toHaveBeenCalledWith('11', 'CANCELED');
  expect(screen.queryByRole('button', { name: 'Cancelar envio' })).toBeNull();
});

it('impede lotes repetidos, saldo excedido e destino igual à origem', () => {
  const form = { destinationStoreId: '20', observation: '', items: [{ id: 'a', inventoryId: '2', quantity: '1' }] };
  expect(toTransferPayload(form, [row], 10).items).toEqual([{ batchId: 5, transferredQuantity: 1 }]);
  expect(() => toTransferPayload({ ...form, destinationStoreId: '10' }, [row], 10)).toThrow();
  expect(() => toTransferPayload({ ...form, items: [...form.items, { id: 'b', inventoryId: '2', quantity: '1' }] }, [row], 10)).toThrow();
  expect(() => toTransferPayload({ ...form, items: [{ id: 'a', inventoryId: '2', quantity: '5' }] }, [row], 10)).toThrow();
  expect(allowedTransferActions(transfer, 20)).toEqual([]);
  expect(allowedTransferActions({ ...transfer, status: 'IN_TRANSIT' }, 20)).toEqual(['receive']);
  expect(allowedTransferActions({ ...transfer, status: 'COMPLETED' }, 10)).toEqual([]);
});
