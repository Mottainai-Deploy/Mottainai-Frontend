import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import StockAdjustments from '../src/pages/StockAdjustments';
import { createDisposal, getDisposals } from '../src/services/disposalService';
import { createConsumption, getInventoryMovements } from '../src/services/inventoryMovementService';
import { getInventoryRows } from '../src/services/inventoryService';
import { getCurrentProfile } from '../src/services/profileService';
import { getDonations, getDonation, createDonation, updateDonationStatus } from '../src/services/donationService';
import { ApiRequestError } from '../src/services/apiClient';
import { operationDateParams } from '../src/utils/operationDateRange';
import { stockExitAttempt, validateConsumptionPayload } from '../src/utils/disposalValidation';
import type { InventoryRow } from '../src/types/inventory-api.types';
import type { DisposalResponse } from '../src/types/stock-disposal.types';

vi.mock('../src/services/disposalService', () => ({ createDisposal: vi.fn(), getDisposals: vi.fn() }));
vi.mock('../src/services/inventoryMovementService', () => ({ createConsumption: vi.fn(), getInventoryMovements: vi.fn() }));
vi.mock('../src/services/inventoryService', () => ({ getInventoryRows: vi.fn() }));
vi.mock('../src/services/profileService', () => ({ getCurrentProfile: vi.fn() }));
vi.mock('../src/services/donationService', () => ({ getDonations: vi.fn(), getDonation: vi.fn(), createDonation: vi.fn(), updateDonationStatus: vi.fn() }));

const inventory: InventoryRow = { id: 2, storeId: 10, batchId: 5, inventoryType: 'NORMAL', currentQuantity: 4, minimumQuantity: 1, maximumQuantity: null,
  location: 'Depósito', version: 0, reactivated: false, productId: 6, productName: 'Produto de teste', barcode: '123', unitMeasure: 'UN', batchCode: 'L1', expirationDate: '2027-01-01' };
const disposal: DisposalResponse = { id: 11, storeId: 10, employeeId: 7, reason: 'Avaria', disposalDate: '2026-11-01T10:00:00', observation: '', version: 0,
  items: [{ id: 1, batchId: 5, disposedQuantity: 1 }] };

beforeEach(() => {
  vi.mocked(getCurrentProfile).mockResolvedValue({ id: 7, name: 'Teste', email: null, role: 'Manager', storeId: 10, active: true });
  vi.mocked(getDonations).mockResolvedValue([]);
  vi.mocked(getDonation).mockReset();
  vi.mocked(createDonation).mockReset();
  vi.mocked(updateDonationStatus).mockReset();
  vi.mocked(getInventoryRows).mockResolvedValue([inventory]);
  vi.mocked(getDisposals).mockResolvedValue([]);
  vi.mocked(getInventoryMovements).mockResolvedValue([]);
  vi.mocked(createDisposal).mockReset();
  vi.mocked(createConsumption).mockReset();
});
afterEach(cleanup);

async function fill(reason = 'Avaria') {
  render(<StockAdjustments />);
  await waitFor(() => expect((screen.getByLabelText('Produto / lote *').closest('fieldset') as HTMLFieldSetElement).disabled).toBe(false));
  fireEvent.change(screen.getByLabelText('Produto / lote *'), { target: { value: '2' } });
  fireEvent.change(screen.getByLabelText('Quantidade a retirar *'), { target: { value: '1' } });
  fireEvent.change(screen.getByLabelText('Motivo *'), { target: { value: reason } });
  fireEvent.click(screen.getByRole('button', { name: 'Revisar baixa' }));
  await screen.findByRole('heading', { name: 'Revisar baixa de estoque' });
}

it('envia descarte por lote somente após a confirmação', async () => {
  vi.mocked(createDisposal).mockResolvedValue(disposal);
  await fill();
  expect(createDisposal).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar baixa e reduzir estoque' }));
  await screen.findByText('Baixa confirmada pelo servidor. Registro 11.');
  expect(createDisposal).toHaveBeenCalledWith({ reason: 'Avaria', observation: '', items: [{ batchId: 5, disposedQuantity: 1 }] }, expect.any(String));
  expect(createConsumption).not.toHaveBeenCalled();
});

it('classifica consumo interno como OUT negativo e não como descarte', async () => {
  vi.mocked(createConsumption).mockResolvedValue({ id: 12, inventoryId: 2, employeeId: 7, movementDate: '2026-11-01T10:00:00', movementType: 'OUT', movedQuantity: -1,
    previousBalance: 4, currentBalance: 3, observation: 'Consumo interno', storeId: 10 });
  await fill('Consumo interno');
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar baixa e reduzir estoque' }));
  await screen.findByText('Baixa confirmada pelo servidor. Registro 12.');
  expect(createConsumption).toHaveBeenCalledWith(2, { movementType: 'OUT', movedQuantity: -1, observation: 'Consumo interno' }, expect.any(String));
  expect(createDisposal).not.toHaveBeenCalled();
});

it('mantém os mesmos dados e chave após uma resposta perdida, bloqueando alteração do formulário', async () => {
  vi.mocked(createDisposal).mockRejectedValueOnce(new Error('Resposta perdida')).mockResolvedValueOnce(disposal);
  await fill();
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar baixa e reduzir estoque' }));
  await screen.findByText('Resposta perdida');
  expect(screen.queryByText(/Baixa confirmada pelo servidor/)).toBeNull();
  expect((screen.getByLabelText('Produto / lote *').closest('fieldset') as HTMLFieldSetElement).disabled).toBe(true);
  vi.mocked(getInventoryRows).mockResolvedValue([{ ...inventory, currentQuantity: 0 }]);
  fireEvent.click(screen.getByRole('button', { name: 'Atualizar registros e estoque' }));
  await waitFor(() => {
    expect(getInventoryRows).toHaveBeenCalledTimes(2);
    expect(screen.queryByText('Carregando estoque disponível…')).toBeNull();
    expect((screen.getByLabelText('Produto / lote *') as HTMLSelectElement).options.length).toBe(1);
  });
  fireEvent.click(screen.getByRole('button', { name: 'Reenviar a mesma baixa' }));
  await screen.findByText('Baixa confirmada pelo servidor. Registro 11.');
  const calls = vi.mocked(createDisposal).mock.calls;
  expect(calls).toHaveLength(2);
  expect(calls[1][0]).toEqual(calls[0][0]);
  expect(calls[1][1]).toBe(calls[0][1]);
});

it('permite corrigir dados após rejeição explícita do servidor', async () => {
  vi.mocked(createDisposal).mockRejectedValue(new ApiRequestError('Saldo insuficiente', 400));
  await fill();
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar baixa e reduzir estoque' }));
  await screen.findByText('Saldo insuficiente');
  await waitFor(() => expect((screen.getByLabelText('Produto / lote *').closest('fieldset') as HTMLFieldSetElement).disabled).toBe(false));
  expect(screen.queryByRole('button', { name: 'Reenviar a mesma baixa' })).toBeNull();
});

it('respeita datas reais, ordem e o limite de seis meses incluindo o dia final', () => {
  expect(operationDateParams({ from: '2026-08-31', to: '2027-02-27' }).get('to')).toBe('2027-02-27T23:59:59.999');
  for (const range of [{ from: '2026-08-31', to: '2027-02-28' }, { from: '2026-02-30', to: '2026-03-01' }, { from: '2026-11-02', to: '2026-11-01' }]) {
    expect(() => operationDateParams(range)).toThrow();
  }
});

it('não aceita zero, excesso de saldo ou consumo com sinal positivo', () => {
  const form = { inventoryId: '2', quantity: '1', reason: 'Consumo interno' as const, observation: ' copa ' };
  expect(stockExitAttempt(form, [inventory], 'key')).toMatchObject({ kind: 'consumption', inventoryId: 2, payload: { movedQuantity: -1, observation: 'Consumo interno: copa' } });
  for (const quantity of ['0', '-1', '5', '0.0001']) expect(() => stockExitAttempt({ ...form, quantity }, [inventory], 'key')).toThrow();
  expect(() => validateConsumptionPayload({ movementType: 'OUT', movedQuantity: 1, observation: 'Consumo interno' })).toThrow();
});
