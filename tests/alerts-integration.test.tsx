import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import Overview from '../src/pages/Overview';
import AlertDetails from '../src/components/AlertDetails';
import { getAlert, getStoreAlerts, updateAlertStatus } from '../src/services/alertService';
import { decideSuggestedAction, getSuggestedActions } from '../src/services/suggestedActionService';
import { ApiRequestError } from '../src/services/apiClient';
import type { ApiAlert, ApiSuggestedAction } from '../src/types/alert-api.types';

vi.mock('../src/services/alertService', () => ({ getAlert: vi.fn(), getStoreAlerts: vi.fn(), updateAlertStatus: vi.fn() }));
vi.mock('../src/services/suggestedActionService', () => ({ decideSuggestedAction: vi.fn(), getSuggestedActions: vi.fn() }));
const alert: ApiAlert = { id: 11, storeId: 10, title: 'Alerta do servidor', description: 'Descrição retornada pela API', alertType: 'EXPIRATION', priority: 'HIGH', status: 'ACTIVE', generatedAt: '2026-11-01T12:00:00', resolvedAt: null, createdAt: '2026-11-01T12:00:00' };
const action: ApiSuggestedAction = { id: 22, alertId: 11, actionType: 'CREATE_TRANSFER', description: 'Sugestão registrada', priority: 'MEDIUM', status: 'PENDING', sourceRecommendationUuid: null, generatedAt: '2026-11-01T12:00:00', createdAt: '2026-11-01T12:00:00' };
beforeEach(() => {
  vi.mocked(updateAlertStatus).mockReset(); vi.mocked(decideSuggestedAction).mockReset();
  vi.mocked(getAlert).mockResolvedValue(alert); vi.mocked(getStoreAlerts).mockResolvedValue([alert]); vi.mocked(getSuggestedActions).mockResolvedValue([action]);
});
afterEach(cleanup);
async function details() {
  const changed = vi.fn();
  render(<AlertDetails id="11" onChanged={changed} />);
  await screen.findByRole('heading', { name: 'Alerta do servidor' });
  return changed;
}
it('lista dados do servidor e filtra sem criar previsões ou recomendações locais', async () => {
  render(<MemoryRouter><Overview /></MemoryRouter>);
  await screen.findByRole('link', { name: 'Abrir alerta 11' });
  fireEvent.change(screen.getByLabelText('Filtrar por status'), { target: { value: 'RESOLVED' } });
  await screen.findByText('Nenhum alerta corresponde à consulta.');
  expect(updateAlertStatus).not.toHaveBeenCalled(); expect(decideSuggestedAction).not.toHaveBeenCalled();
});
it('mostra falha da consulta sem declarar sucesso vazio', async () => {
  vi.mocked(getStoreAlerts).mockRejectedValue(new ApiRequestError('Sem permissão para alertas', 403));
  render(<MemoryRouter><Overview /></MemoryRouter>);
  await screen.findByText('Sem permissão para alertas');
  expect(screen.queryByText('Nenhum alerta corresponde à consulta.')).toBeNull();
});
it('altera status somente após revisão, usando o resultado retornado pelo servidor', async () => {
  vi.mocked(updateAlertStatus).mockResolvedValue({ ...alert, status: 'ANALYZING' });
  const changed = await details();
  fireEvent.change(screen.getByLabelText('Novo status do alerta'), { target: { value: 'ANALYZING' } });
  fireEvent.click(screen.getByRole('button', { name: 'Revisar alteração de status' }));
  expect(updateAlertStatus).not.toHaveBeenCalled();
  expect(document.activeElement?.id).toBe('alert-review-title');
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar operação' }));
  await waitFor(() => expect(changed).toHaveBeenCalledTimes(1));
  expect(updateAlertStatus).toHaveBeenCalledWith('11', 'ANALYZING');
  expect(screen.getByText(/Status: Em análise/)).toBeTruthy();
});
it.each([['aprovação', 'APPROVED', 'Aprovada'], ['rejeição', 'REJECTED', 'Rejeitada']] as const)('registra %s somente para sugestão pendente', async (label, decision, statusLabel) => {
  vi.mocked(decideSuggestedAction).mockResolvedValue({ ...action, status: decision });
  await details();
  fireEvent.click(screen.getByRole('button', { name: `Revisar ${label} da ação 22` }));
  expect(decideSuggestedAction).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar operação' }));
  await screen.findByText(new RegExp(`Status: ${statusLabel}`));
  expect(decideSuggestedAction).toHaveBeenCalledWith(22, decision);
  expect(screen.queryByRole('button', { name: /Revisar aprovação da ação/ })).toBeNull();
  expect(updateAlertStatus).not.toHaveBeenCalled();
});
it('não permite nova decisão para sugestões já decididas ou executadas', async () => {
  vi.mocked(getSuggestedActions).mockResolvedValue([{ ...action, status: 'APPROVED' }, { ...action, id: 23, status: 'EXECUTED' }]);
  await details();
  expect(screen.queryByRole('button', { name: /Revisar aprovação/ })).toBeNull();
  expect(screen.queryByRole('button', { name: /Revisar rejeição/ })).toBeNull();
});
it('cancela revisão sem enviar a operação e devolve o foco', async () => {
  await details();
  const button = screen.getByRole('button', { name: 'Revisar aprovação da ação 22' });
  fireEvent.click(button);
  fireEvent.click(screen.getByRole('button', { name: 'Voltar sem confirmar' }));
  await waitFor(() => expect(document.activeElement).toBe(button));
  expect(decideSuggestedAction).not.toHaveBeenCalled();
});
it('reconcilia resposta perdida antes de liberar novas ações e evita repetir decisão aplicada', async () => {
  vi.mocked(decideSuggestedAction).mockRejectedValue(new Error('Resposta perdida'));
  const changed = await details();
  fireEvent.click(screen.getByRole('button', { name: 'Revisar aprovação da ação 22' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar operação' }));
  await screen.findByRole('alert');
  expect((screen.getByRole('button', { name: 'Revisar aprovação da ação 22' }) as HTMLButtonElement).disabled).toBe(true);
  expect(changed).not.toHaveBeenCalled();
  vi.mocked(getSuggestedActions).mockResolvedValue([{ ...action, status: 'APPROVED' }]);
  fireEvent.click(screen.getByRole('button', { name: 'Consultar estado do alerta' }));
  await screen.findByText(/Status: Aprovada/);
  expect(screen.queryByRole('button', { name: 'Revisar aprovação da ação 22' })).toBeNull();
  expect(decideSuggestedAction).toHaveBeenCalledTimes(1);
});
it('mantém bloqueio quando a consulta de reconciliação falha', async () => {
  vi.mocked(updateAlertStatus).mockRejectedValue(new ApiRequestError('Alerta alterado em outra sessão', 409));
  await details();
  fireEvent.change(screen.getByLabelText('Novo status do alerta'), { target: { value: 'RESOLVED' } });
  fireEvent.click(screen.getByRole('button', { name: 'Revisar alteração de status' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar operação' }));
  await screen.findByRole('alert');
  vi.mocked(getAlert).mockRejectedValue(new Error('Consulta indisponível'));
  fireEvent.click(screen.getByRole('button', { name: 'Consultar estado do alerta' }));
  await screen.findByText('Consulta indisponível');
  expect(screen.queryByLabelText('Novo status do alerta')).toBeNull();
  expect(updateAlertStatus).toHaveBeenCalledTimes(1);
});
