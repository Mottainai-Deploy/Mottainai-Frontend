import ConfirmedAction from '@/components/ConfirmedAction';
import { useDonationOperations } from '@/hooks/useDonationOperations';
import { formatBatchDate } from '@/utils/inventoryPresentation';
import { donationStatusLabels } from '@/utils/operationalPresentation';
import type { InventoryRow } from '@/types/inventory-api.types';
import styles from '@/styles/operations.module.css';

export interface DonationOperationsProps { trackedDonationId: number | null; inventory: InventoryRow[]; inventoryStatus: 'loading' | 'error' | 'success'; }

export default function DonationOperations({ trackedDonationId, inventory, inventoryStatus }: DonationOperationsProps) {
  const editor = useDonationOperations(trackedDonationId, inventory);
  const { state, query, detail } = editor;
  const disabled = state.busy || state.uncertain || query.status !== 'success' || inventoryStatus !== 'success';

  return <section className={styles.page} aria-labelledby="donation-operations-title">
    <h2 id="donation-operations-title">Doações</h2>
    <p>Registrar uma doação não altera o saldo. Concluir a doação registra a saída de estoque.</p>
    {(query.status === 'loading' || inventoryStatus === 'loading') && <p role="status">Carregando doações e lotes disponíveis…</p>}
    {query.status === 'error' && <p role="alert">{query.error}</p>}
    {query.status === 'success' && <p role="status">Consulta concluída: {query.data.donations.length} doação(ões) no período.</p>}
    {state.feedback && <p role={state.feedbackIsError ? 'alert' : 'status'}>{state.feedback}</p>}

    <form className={styles.card} aria-label="Consultar doações por período" onSubmit={(event) => { event.preventDefault(); editor.applyRange(); }}>
      <div className={styles.grid}>
        <div className={styles.field}><label htmlFor="donations-from">Data inicial</label><input id="donations-from" type="date" value={state.range.from} onChange={(event) => editor.changeRange('from', event.target.value)} /></div>
        <div className={styles.field}><label htmlFor="donations-to">Data final</label><input id="donations-to" type="date" value={state.range.to} onChange={(event) => editor.changeRange('to', event.target.value)} /></div>
      </div><div className={styles.actions}><button type="submit" disabled={state.busy}>Aplicar período</button><button type="button" disabled={state.busy} onClick={editor.refresh}>Atualizar doações</button></div>
    </form>

    {query.status === 'success' && <section className={styles.card} aria-labelledby="donations-list-title"><h3 id="donations-list-title">Registros de doação</h3>
      {!state.creating && <button type="button" disabled={state.busy || state.uncertain} onClick={editor.startCreate}>Registrar outra doação</button>}
      {query.data.donations.length === 0 ? <p>Nenhuma doação encontrada no período.</p> : <ul>{query.data.donations.map((donation) => <li key={donation.id}>
        <button type="button" disabled={state.busy} onClick={() => editor.select(donation.id)}>Doação {donation.id} — {donationStatusLabels[donation.status]}</button>
        <span> {donation.institution}; {formatBatchDate(donation.donationDate)}.</span>
      </li>)}</ul>}
    </section>}

    {state.creating && !state.reviewing && <form className={styles.card} aria-labelledby="donation-form-title" onSubmit={(event) => { event.preventDefault(); editor.submit(); }}>
      <h3 id="donation-form-title">Registrar doação</h3>
      <fieldset className={styles.fields} disabled={disabled}>
        <legend>Instituição e itens</legend>
        <div className={styles.grid}>
          <div className={styles.field}><label htmlFor="donation-institution">Instituição destinatária</label><input id="donation-institution" required maxLength={150} value={state.draft.institution} onChange={(event) => editor.edit('institution', event.target.value)} /></div>
          <div className={styles.field}><label htmlFor="donation-observation">Observação (opcional)</label><textarea id="donation-observation" maxLength={2000} value={state.draft.observation} onChange={(event) => editor.edit('observation', event.target.value)} /></div>
        </div>
        {state.draft.items.map((item, index) => <fieldset className={styles.card} key={item.id}><legend>Item {index + 1}</legend><div className={styles.grid}>
          <div className={styles.field}><label htmlFor={`donation-batch-${item.id}`}>Produto e lote</label><select id={`donation-batch-${item.id}`} required value={item.batchId} onChange={(event) => editor.editItem(item.id, 'batchId', event.target.value)}><option value="">Selecione um lote do estoque normal</option>{editor.available.map((row) => <option key={row.id} value={row.batchId}>{row.productName} — lote {row.batchCode}; saldo consultado {row.currentQuantity.toLocaleString('pt-BR')} {row.unitMeasure}</option>)}</select></div>
          <div className={styles.field}><label htmlFor={`donation-quantity-${item.id}`}>Quantidade para doação</label><input id={`donation-quantity-${item.id}`} inputMode="decimal" required value={item.donatedQuantity} onChange={(event) => editor.editItem(item.id, 'donatedQuantity', event.target.value)} /></div>
        </div><button type="button" disabled={disabled || state.draft.items.length < 2} onClick={() => editor.removeItem(item.id)}>Remover item {index + 1}</button></fieldset>)}
        <div className={styles.actions}><button type="button" onClick={editor.addItem}>Adicionar item</button><button type="submit">Revisar registro</button><button type="button" onClick={editor.cancelCreate}>Cancelar registro</button></div>
      </fieldset>
    </form>}

    {state.reviewing && state.pending && <section className={styles.card} aria-labelledby="donation-review-title"><h3 id="donation-review-title" tabIndex={-1}>Revisar registro da doação</h3>
      <p>Instituição: {state.pending.payload.institution}. Confirmar registra a doação, sem baixar o estoque neste momento.</p>
      {state.pending.payload.items.map((item) => { const row = inventory.find((entry) => entry.batchId === item.batchId); return <p key={item.batchId}>{row ? `${row.productName} — lote ${row.batchCode}` : `Lote ${item.batchId}`}: {item.donatedQuantity.toLocaleString('pt-BR')} {row?.unitMeasure ?? ''}.</p>; })}
      {state.uncertain && <p>Os mesmos dados e a mesma chave permanecem guardados. Reenvie esta solicitação para recuperar o resultado.</p>}
      <div className={styles.actions}>{!state.uncertain && <button type="button" disabled={state.busy} onClick={editor.confirm}>Confirmar registro</button>}{state.uncertain && <button type="button" disabled={state.busy} onClick={editor.retry}>Reenviar a mesma solicitação</button>}{!state.uncertain && <button type="button" disabled={state.busy} onClick={editor.cancelReview}>Voltar sem registrar</button>}</div>
    </section>}

    {detail.status === 'loading' && <p role="status">Consultando registro da doação…</p>}
    {detail.status === 'error' && <p role="alert">{detail.error}</p>}
    {detail.status === 'success' && detail.data && <section className={styles.card} aria-labelledby="donation-detail-title"><h3 id="donation-detail-title">Doação {detail.data.id}</h3>
      <p>Status: {donationStatusLabels[detail.data.status]}. Instituição: {detail.data.institution}.</p>
      {detail.data.items.map((item) => { const row = inventory.find((entry) => entry.batchId === item.batchId); return <p key={item.id}>{row ? `${row.productName} — lote ${row.batchCode}` : `Lote ${item.batchId}`}: {item.donatedQuantity.toLocaleString('pt-BR')} {row?.unitMeasure ?? ''}.</p>; })}
      {detail.data.status === 'REGISTERED' && <div className={styles.actions}>
        <ConfirmedAction label={`Concluir doação ${detail.data.id}`} effect="A conclusão registra a saída das quantidades listadas no estoque normal. Confira os itens antes de confirmar." execute={() => editor.changeStatus(detail.data!.id, 'COMPLETED')} verify={() => editor.verify(detail.data!.id)} disabled={state.busy || state.uncertain} onBusyChange={editor.setBusy} onUncertainChange={editor.setUncertain} />
        <ConfirmedAction label={`Cancelar doação ${detail.data.id}`} effect="A doação será cancelada e não deverá ser concluída." execute={() => editor.changeStatus(detail.data!.id, 'CANCELED')} verify={() => editor.verify(detail.data!.id)} disabled={state.busy || state.uncertain} onBusyChange={editor.setBusy} onUncertainChange={editor.setUncertain} />
      </div>}
    </section>}
  </section>;
}
