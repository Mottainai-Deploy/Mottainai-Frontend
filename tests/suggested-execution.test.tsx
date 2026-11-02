import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import SuggestedExecution from '../src/components/SuggestedExecution';
import AlertDetails from '../src/components/AlertDetails';
import { executeSuggestedAction, getExecutionContext, getSuggestedActions } from '../src/services/suggestedActionService';
import { getAlert } from '../src/services/alertService';
import { ApiRequestError } from '../src/services/apiClient';
import { emptyExecutionDraft, toExecutionPayload } from '../src/utils/suggestedExecutionValidation';
import type { ApiSuggestedAction, SuggestedActionType } from '../src/types/alert-api.types';
import type { ExecutionContext, ExecutionDraft, ExecutionResult } from '../src/types/suggested-execution.types';

vi.mock('../src/services/suggestedActionService', () => ({ executeSuggestedAction: vi.fn(), getExecutionContext: vi.fn(), getSuggestedActions: vi.fn(), decideSuggestedAction: vi.fn() }));
vi.mock('../src/services/alertService', () => ({ getAlert: vi.fn(), updateAlertStatus: vi.fn() }));
const action: ApiSuggestedAction = { id: 22, alertId: 11, actionType: 'CREATE_TRANSFER', description: 'Sugestão do servidor', priority: 'HIGH', status: 'APPROVED', sourceRecommendationUuid: null, generatedAt: '2026-11-01T12:00:00', createdAt: '2026-11-01T12:00:00' };
const context: ExecutionContext = {
  profile: { id: 7, name: 'Pessoa de teste', email: 'teste@example.invalid', role: 'Cargo', storeId: 10, active: true },
  products: [{ id: 6, companyId: 1, categoryId: 1, categoryName: 'Categoria', taxProfileId: 1, sku: 'P6', barcode: '123', ncm: '12345678', cest: null, name: 'Produto de teste', description: null, brand: null, unitMeasure: 'UN', weight: null, active: true, version: 0 }],
  inventory: [{ id: 2, storeId: 10, batchId: 5, productId: 6, productName: 'Produto de teste', barcode: '123', unitMeasure: 'UN', batchCode: 'L1', expirationDate: '2027-01-01', inventoryType: 'NORMAL', currentQuantity: 4, minimumQuantity: 1, maximumQuantity: null, location: null, version: 0, reactivated: false }],
  suppliers: [{ id: '8', addressId: 3, tradeName: 'Fornecedor de teste', cnpj: '123', email: '', phone: '', linkedSkus: '', active: true }],
  stores: [{ id: 20, name: 'Loja de destino', active: true }], storeListAvailable: true,
};
function draftFor(type: SuggestedActionType): ExecutionDraft {
  const draft = emptyExecutionDraft();
  Object.assign(draft, { supplierId: '8', expectedDeliveryDate: '2026-11-05', destinationStoreId: '20', institution: 'Instituição de teste', reason: 'Vencimento', name: 'Promoção de teste', description: 'Descrição', promotionType: 'SPECIAL_PRICE', startsAt: '2026-11-01T10:00', endsAt: '2026-11-02T10:00', observation: 'Observação' });
  Object.assign(draft.items[0], { referenceId: ['CREATE_TRANSFER', 'CREATE_DONATION', 'CREATE_DISPOSAL'].includes(type) ? '2' : '6', quantity: '1,5', unitCost: '2,50', originalPrice: '10', promotionalPrice: '8', quantityAvailable: '0', priority: 'HIGH' });
  return draft;
}
beforeEach(() => { vi.mocked(executeSuggestedAction).mockReset(); vi.mocked(getExecutionContext).mockResolvedValue(context); });
afterEach(cleanup);

const contracts = [
  ['CREATE_PURCHASE_ORDER', { supplierId: 8, expectedDeliveryDate: '2026-11-05', observation: 'Observação', items: [{ productId: 6, requestedQuantity: 1.5, unitCost: 2.5 }] }],
  ['CREATE_TRANSFER', { destinationStoreId: 20, observation: 'Observação', items: [{ batchId: 5, quantity: 1.5 }] }],
  ['CREATE_DONATION', { institution: 'Instituição de teste', observation: 'Observação', items: [{ batchId: 5, quantity: 1.5 }] }],
  ['CREATE_DISPOSAL', { reason: 'Vencimento', observation: 'Observação', items: [{ batchId: 5, quantity: 1.5 }] }],
  ['CREATE_PROMOTION', { name: 'Promoção de teste', description: 'Descrição', promotionType: 'SPECIAL_PRICE', startsAt: '2026-11-01T10:00:00', endsAt: '2026-11-02T10:00:00', items: [{ productId: 6, originalPrice: 10, promotionalPrice: 8, quantityAvailable: 0 }] }],
  ['CREATE_REPLENISHMENT', { items: [{ productId: 6, quantity: 1.5, priority: 'HIGH' }] }],
] as const;
it.each(contracts)('monta somente os campos aceitos para %s', (type, expected) => {
  expect(toExecutionPayload({ ...action, actionType: type }, 10, draftFor(type), context)).toEqual(expected);
});
it('valida saldo, duplicidade, contexto de loja e sugestões encerradas', () => {
  const draft = draftFor('CREATE_DISPOSAL');
  draft.items[0].quantity = '5'; expect(() => toExecutionPayload({ ...action, actionType: 'CREATE_DISPOSAL' }, 10, draft, context)).toThrow(/saldo/);
  draft.items[0].quantity = '1'; draft.items.push({ ...draft.items[0], id: 'second' });
  expect(() => toExecutionPayload({ ...action, actionType: 'CREATE_DISPOSAL' }, 10, draft, context)).toThrow(/repetido/);
  expect(() => toExecutionPayload(action, 20, draft, context)).toThrow(/loja/);
  expect(() => toExecutionPayload({ ...action, status: 'EXECUTED' }, 10, draft, context)).toThrow(/não está disponível/);
});
it('valida promoção por contrato do banco, preços e período', () => {
  const draft = draftFor('CREATE_PROMOTION'); const promotion = { ...action, actionType: 'CREATE_PROMOTION' as const };
  draft.promotionType = 'INVENTED'; expect(() => toExecutionPayload(promotion, 10, draft, context)).toThrow(/tipo de promoção/);
  draft.promotionType = 'SPECIAL_PRICE'; draft.items[0].promotionalPrice = '11'; expect(() => toExecutionPayload(promotion, 10, draft, context)).toThrow(/preço promocional/);
  draft.items[0].promotionalPrice = '8'; draft.endsAt = draft.startsAt; expect(() => toExecutionPayload(promotion, 10, draft, context)).toThrow(/posterior/);
});
async function form(type: SuggestedActionType) {
  const completed = vi.fn();
  render(<MemoryRouter><SuggestedExecution action={{ ...action, actionType: type }} storeId={10} onClose={vi.fn()} onCompleted={completed} /></MemoryRouter>);
  await waitFor(() => expect(screen.queryByText('Carregando opções para a operação…')).toBeNull());
  fireEvent.change(screen.getByLabelText(/(?:Produto \/ lote|Produto) do item 1/), { target: { value: ['CREATE_TRANSFER', 'CREATE_DONATION', 'CREATE_DISPOSAL'].includes(type) ? '2' : '6' } });
  if (type !== 'CREATE_PROMOTION') fireEvent.change(screen.getByLabelText('Quantidade do item 1'), { target: { value: '1' } });
  if (type === 'CREATE_PURCHASE_ORDER') { fireEvent.change(screen.getByLabelText('Fornecedor'), { target: { value: '8' } }); fireEvent.change(screen.getByLabelText('Custo unitário do item 1 (R$)'), { target: { value: '2' } }); }
  if (type === 'CREATE_TRANSFER') fireEvent.change(screen.getByLabelText('Loja de destino'), { target: { value: '20' } });
  if (type === 'CREATE_DONATION') fireEvent.change(screen.getByLabelText('Instituição destinatária'), { target: { value: 'Instituição' } });
  if (type === 'CREATE_DISPOSAL') fireEvent.change(screen.getByLabelText('Motivo do descarte'), { target: { value: 'Vencimento' } });
  if (type === 'CREATE_REPLENISHMENT') fireEvent.change(screen.getByLabelText('Prioridade do item 1'), { target: { value: 'HIGH' } });
  if (type === 'CREATE_PROMOTION') {
    fireEvent.change(screen.getByLabelText('Nome da promoção'), { target: { value: 'Promoção' } }); fireEvent.change(screen.getByLabelText('Tipo de promoção'), { target: { value: 'SPECIAL_PRICE' } });
    fireEvent.change(screen.getByLabelText('Início da promoção (horário local)'), { target: { value: '2026-11-01T10:00' } }); fireEvent.change(screen.getByLabelText('Fim da promoção (horário local)'), { target: { value: '2026-11-02T10:00' } });
    fireEvent.change(screen.getByLabelText('Preço original do item 1 (R$)'), { target: { value: '10' } }); fireEvent.change(screen.getByLabelText('Preço promocional do item 1 (R$)'), { target: { value: '8' } });
  }
  fireEvent.click(screen.getByRole('button', { name: 'Revisar execução' }));
  await screen.findByRole('heading', { name: 'Revisar execução da ação 22' });
  return completed;
}
it.each(contracts)('formulário de %s executa somente após revisão e mostra o registro criado', async (type) => {
  vi.mocked(executeSuggestedAction).mockResolvedValue({ suggestedAction: { ...action, actionType: type, status: 'EXECUTED' }, entityType: 'synthetic_entity', entityId: 99 });
  const completed = await form(type);
  expect(executeSuggestedAction).not.toHaveBeenCalled(); expect(document.activeElement?.id).toBe('execution-review-title');
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar execução' }));
  await screen.findByText(/Registro criado: synthetic_entity, identificador 99/);
  expect(executeSuggestedAction).toHaveBeenCalledWith(22, expect.objectContaining({ items: expect.any(Array) }), expect.any(String));
  expect(completed).not.toHaveBeenCalled(); fireEvent.click(screen.getByRole('button', { name: 'Concluir e atualizar alerta' })); expect(completed).toHaveBeenCalledTimes(1);
});
it('mantém chave e corpo congelados após resposta perdida', async () => {
  vi.mocked(executeSuggestedAction).mockRejectedValueOnce(new Error('Resposta perdida')).mockResolvedValueOnce({ suggestedAction: { ...action, status: 'EXECUTED' }, entityType: 'transfer', entityId: 99 });
  await form('CREATE_TRANSFER'); fireEvent.click(screen.getByRole('button', { name: 'Confirmar execução' }));
  await screen.findByRole('button', { name: 'Reenviar a mesma execução' });
  expect((screen.getByLabelText('Quantidade do item 1').closest('fieldset')?.parentElement?.closest('fieldset') as HTMLFieldSetElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Reenviar a mesma execução' }));
  await screen.findByRole('link', { name: 'Abrir transferência 99' });
  const calls = vi.mocked(executeSuggestedAction).mock.calls; expect(calls).toHaveLength(2); expect(calls[1]).toEqual(calls[0]);
});
it('permite corrigir após recusa conhecida e não declara sucesso', async () => {
  vi.mocked(executeSuggestedAction).mockRejectedValue(new ApiRequestError('Saldo insuficiente', 409));
  const completed = await form('CREATE_DISPOSAL'); fireEvent.click(screen.getByRole('button', { name: 'Confirmar execução' }));
  await screen.findByText('Saldo insuficiente'); expect(screen.queryByRole('button', { name: 'Confirmar execução' })).toBeNull(); expect(completed).not.toHaveBeenCalled();
  expect((screen.getByRole('button', { name: 'Revisar execução' }).closest('fieldset') as HTMLFieldSetElement).disabled).toBe(false);
});
it('bloqueia duplo envio enquanto aguarda o servidor', async () => {
  let resolve: (value: ExecutionResult) => void = () => {};
  vi.mocked(executeSuggestedAction).mockImplementation(() => new Promise((done) => { resolve = done; }));
  await form('CREATE_DISPOSAL'); const button = screen.getByRole('button', { name: 'Confirmar execução' }); fireEvent.click(button); fireEvent.click(button);
  expect(executeSuggestedAction).toHaveBeenCalledTimes(1);
  resolve({ suggestedAction: { ...action, actionType: 'CREATE_DISPOSAL', status: 'EXECUTED' }, entityType: 'disposal', entityId: 99 }); await screen.findByText(/identificador 99/);
});
it('não oferece execução para ações rejeitadas ou executadas', async () => {
  vi.mocked(getAlert).mockResolvedValue({ id: 11, storeId: 10, title: 'Alerta', description: null, alertType: 'EXPIRATION', priority: 'HIGH', status: 'ACTIVE', generatedAt: '', resolvedAt: null, createdAt: '' });
  vi.mocked(getSuggestedActions).mockResolvedValue([{ ...action, status: 'REJECTED' }, { ...action, id: 23, status: 'EXECUTED' }]);
  render(<MemoryRouter><AlertDetails id="11" onChanged={vi.fn()} /></MemoryRouter>);
  await screen.findByRole('heading', { name: 'Alerta', exact: true });
  expect(screen.queryByRole('button', { name: /Preparar execução/ })).toBeNull();
});
