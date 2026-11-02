import DropdownSelect from '@/components/DropdownSelect';
import ReusableTable from '@/components/ReusableTable';
import { useStockDisposals } from '@/hooks/useStockDisposals';
import type { DisposalResponse } from '@/types/stock-disposal.types';
import type { InventoryMovementResponse } from '@/types/inventory-movement-api.types';
import type { ReusableTableColumn } from '@/types/reusable-table.types';
import { formatCountDate } from '@/utils/inventoryPresentation';
import styles from './style.module.css';
import DonationOperations from '@/components/DonationOperations';

export interface StockAdjustmentsProps { trackedDonationId?: number | null; }

export default function StockAdjustments({ trackedDonationId = null }: StockAdjustmentsProps) {
  const editor = useStockDisposals();
  const { state } = editor;
  const batchMap = new Map(editor.inventory.data.map((item) => [item.batchId, item]));
  const inventoryMap = new Map(editor.inventory.data.map((item) => [item.id, item]));
  const disposalColumns: ReusableTableColumn<DisposalResponse>[] = [
    { id: 'id', header: 'Registro', renderCell: (record) => record.id },
    { id: 'date', header: 'Data', renderCell: (record) => formatCountDate(record.disposalDate) },
    { id: 'reason', header: 'Motivo', renderCell: (record) => record.reason },
    { id: 'items', header: 'Produto / lote / quantidade', renderCell: (record) => record.items.map((item) => {
      const row = batchMap.get(item.batchId);
      return <p key={item.id}>{row ? `${row.productName} — ${row.batchCode}` : `Lote ${item.batchId}`}: {item.disposedQuantity.toLocaleString('pt-BR')} {row?.unitMeasure ?? ''}</p>;
    }) },
    { id: 'employee', header: 'Funcionário', renderCell: (record) => record.employeeId },
    { id: 'note', header: 'Observação', renderCell: (record) => record.observation || 'Não informada' },
  ];
  const consumptionColumns: ReusableTableColumn<InventoryMovementResponse>[] = [
    { id: 'id', header: 'Registro', renderCell: (record) => record.id },
    { id: 'date', header: 'Data', renderCell: (record) => formatCountDate(record.movementDate) },
    { id: 'product', header: 'Produto / lote', renderCell: (record) => {
      const row = inventoryMap.get(record.inventoryId);
      return row ? `${row.productName} — ${row.batchCode}` : `Item de estoque ${record.inventoryId}`;
    } },
    { id: 'quantity', header: 'Quantidade retirada', renderCell: (record) => `${Math.abs(record.movedQuantity).toLocaleString('pt-BR')} ${inventoryMap.get(record.inventoryId)?.unitMeasure ?? ''}` },
    { id: 'before', header: 'Saldo anterior', renderCell: (record) => record.previousBalance.toLocaleString('pt-BR') },
    { id: 'after', header: 'Saldo após a saída', renderCell: (record) => record.currentBalance.toLocaleString('pt-BR') },
    { id: 'employee', header: 'Funcionário', renderCell: (record) => record.employeeId },
    { id: 'note', header: 'Observação', renderCell: (record) => record.observation },
  ];
  const locked = editor.blocked || state.reviewing;
  return (
    <section className={styles.page} aria-labelledby="stock-adjustments-title">
      <h1 id="stock-adjustments-title">Avarias, vencimentos e consumo interno</h1>
      <p>A baixa retira quantidade do estoque normal da sua loja. O servidor identifica o funcionário responsável.</p>
      {state.message && <p id="disposal-feedback" tabIndex={-1} role={state.failed ? 'alert' : 'status'} className={styles.operationFeedback}>{state.message}</p>}
      {editor.inventory.status === 'loading' && <p role="status">Carregando estoque disponível…</p>}
      {editor.inventory.status === 'error' && <p role="alert">{editor.inventory.error}</p>}
      <div className={styles.topGrid}>
        <form className={styles.formCard} onSubmit={editor.review} noValidate>
          <h2>Registrar baixa</h2>
          <fieldset className={styles.operationFields} disabled={locked || editor.inventory.status !== 'success'}>
            <legend>Produto, lote e motivo</legend>
            <div className={styles.formField}>
              <label htmlFor="disposal-inventoryId">Produto / lote *</label>
              <DropdownSelect id="disposal-inventoryId" value={state.form.inventoryId} required
                onChange={(event) => editor.change('inventoryId', event.target.value)}
                ariaInvalid={Boolean(state.errors.inventoryId)} ariaDescribedBy={state.errors.inventoryId ? 'disposal-inventory-error' : undefined}>
                <option value="">Selecione um lote com saldo disponível</option>
                {editor.available.map((item) => <option key={item.id} value={item.id}>{item.productName} — {item.batchCode} — saldo {item.currentQuantity.toLocaleString('pt-BR')} {item.unitMeasure}</option>)}
              </DropdownSelect>
              {state.errors.inventoryId && <span id="disposal-inventory-error" className={styles.fieldError}>{state.errors.inventoryId}</span>}
            </div>
            <div className={styles.formRow}>
              <div className={styles.formField}>
                <label htmlFor="disposal-quantity">Quantidade a retirar *</label>
                <input id="disposal-quantity" inputMode="decimal" required value={state.form.quantity}
                  onChange={(event) => editor.change('quantity', event.target.value)}
                  aria-invalid={Boolean(state.errors.quantity)} aria-describedby={state.errors.quantity ? 'disposal-quantity-error' : undefined} />
                {state.errors.quantity && <span id="disposal-quantity-error" className={styles.fieldError}>{state.errors.quantity}</span>}
              </div>
              <div className={styles.formField}>
                <label htmlFor="disposal-reason">Motivo *</label>
                <DropdownSelect id="disposal-reason" value={state.form.reason} required
                  onChange={(event) => editor.change('reason', event.target.value)}
                  ariaInvalid={Boolean(state.errors.reason)} ariaDescribedBy={state.errors.reason ? 'disposal-reason-error' : undefined}>
                  <option value="Avaria">Avaria</option>
                  <option value="Vencimento">Vencimento</option>
                  <option value="Consumo interno">Consumo interno</option>
                </DropdownSelect>
                {state.errors.reason && <span id="disposal-reason-error" className={styles.fieldError}>{state.errors.reason}</span>}
              </div>
            </div>
            <div className={styles.formField}>
              <label htmlFor="disposal-observation">Observação</label>
              <textarea id="disposal-observation" rows={3} maxLength={500} value={state.form.observation}
                onChange={(event) => editor.change('observation', event.target.value)}
                aria-invalid={Boolean(state.errors.observation)} aria-describedby={state.errors.observation ? 'disposal-note-error' : undefined} />
              {state.errors.observation && <span id="disposal-note-error" className={styles.fieldError}>{state.errors.observation}</span>}
            </div>
          </fieldset>
          <button id="disposal-review-button" type="submit" className={styles.submitButton} disabled={locked || editor.inventory.status !== 'success' || editor.available.length === 0}>Revisar baixa</button>
          {editor.inventory.status === 'success' && editor.available.length === 0 && <p role="status">Não há lotes com saldo no estoque normal.</p>}
        </form>
        <aside className={styles.summaryCard} aria-labelledby="operation-summary-title">
          <h2 id="operation-summary-title">Registros no período consultado</h2>
          <p>De {state.appliedRange.from.split('-').reverse().join('/')} a {state.appliedRange.to.split('-').reverse().join('/')}</p>
          {editor.disposals.status === 'success' && <p>{editor.disposals.data.length === 1 ? '1 registro de descarte.' : `${editor.disposals.data.length} registros de descarte.`}</p>}
          {editor.movements.status === 'success' && <p>{editor.consumptions.length === 1 ? '1 saída identificada como consumo interno.' : `${editor.consumptions.length} saídas identificadas como consumo interno.`}</p>}
          <p>Quantidades, saldos e funcionários são confirmados pelo servidor.</p>
        </aside>
      </div>
      {state.reviewing && !state.pending && <section className={styles.reviewCard} aria-labelledby="disposal-review-title">
        <h2 id="disposal-review-title" tabIndex={-1}>Revisar baixa de estoque</h2>
        <p>{editor.selected?.productName} — {editor.selected?.batchCode}</p>
        <p>Retirada: {state.form.quantity} {editor.selected?.unitMeasure}. Motivo: {state.form.reason}.</p>
        <p>Observação: {state.form.observation || 'Não informada'}.</p>
        <p>Confirmar registra a operação e reduz o saldo de estoque.</p>
        <div className={styles.operationActions}>
          <button type="button" onClick={editor.confirm} disabled={editor.blocked || editor.inventory.status !== 'success'}>Confirmar baixa e reduzir estoque</button>
          <button id="disposal-cancel-review" type="button" onClick={editor.cancelReview} disabled={editor.blocked}>Voltar à edição</button>
        </div>
      </section>}
      {state.pending && !state.busy && <section className={styles.reviewCard} aria-labelledby="disposal-pending-title">
        <h2 id="disposal-pending-title">Baixa ainda não confirmada</h2>
        <p>{editor.selected ? `${editor.selected.productName} — ${editor.selected.batchCode}` : `Item de estoque ${state.form.inventoryId}`}.</p>
        <p>Retirada original: {state.form.quantity} {editor.selected?.unitMeasure}. Motivo: {state.form.reason}.</p>
        <p>Observação original: {state.form.observation || 'Não informada'}.</p>
        <p>A conexão pode ter sido interrompida após a gravação. Reenviar mantém os mesmos dados e a identificação da operação para o servidor reconhecer uma baixa já registrada.</p>
        <p>Mantenha esta página aberta até confirmar o resultado. Se sair ou recarregar, consulte os registros antes de criar uma nova baixa.</p>
        <button type="button" onClick={editor.retry}>Reenviar a mesma baixa</button>
      </section>}
      <form className={styles.rangeForm} onSubmit={editor.applyRange} noValidate aria-label="Consultar registros por período">
        <label htmlFor="disposal-from">Data inicial
          <input id="disposal-from" type="date" value={state.range.from} onChange={(event) => editor.changeRange('from', event.target.value)}
            aria-invalid={Boolean(state.rangeError)} aria-describedby={state.rangeError ? 'disposal-range-error' : undefined} />
        </label>
        <label htmlFor="disposal-to">Data final
          <input id="disposal-to" type="date" value={state.range.to} onChange={(event) => editor.changeRange('to', event.target.value)}
            aria-invalid={Boolean(state.rangeError)} aria-describedby={state.rangeError ? 'disposal-range-error' : undefined} />
        </label>
        <button type="submit">Aplicar período</button>
        <button type="button" onClick={editor.refresh} disabled={state.busy}>Atualizar registros e estoque</button>
      </form>
      {state.rangeError && <p id="disposal-range-error" role="alert">{state.rangeError}</p>}
      {editor.disposals.status === 'loading' && <p role="status">Consultando descartes…</p>}
      {editor.disposals.status === 'error' && <p role="alert">{editor.disposals.error}</p>}
      {editor.disposals.status === 'success' && <div className={styles.recordsSection}>
        <p role="status">{editor.disposals.data.length === 1 ? '1 registro de descarte encontrado.' : `${editor.disposals.data.length} registros de descarte encontrados.`}</p>
        <ReusableTable title="Avarias e vencimentos" columns={disposalColumns} data={editor.disposals.data} rowKey={(item) => item.id} emptyMessage="Nenhum descarte encontrado no período." />
      </div>}
      {editor.movements.status === 'loading' && <p role="status">Consultando saídas de consumo interno…</p>}
      {editor.movements.status === 'error' && <p role="alert">{editor.movements.error}</p>}
      {editor.movements.status === 'success' && <div className={styles.recordsSection}>
        <p role="status">{editor.consumptions.length === 1 ? '1 registro de consumo interno encontrado.' : `${editor.consumptions.length} registros de consumo interno encontrados.`}</p>
        <ReusableTable title="Consumo interno" columns={consumptionColumns} data={editor.consumptions} rowKey={(item) => item.id} emptyMessage="Nenhuma saída identificada como consumo interno no período." />
      </div>}
      <DonationOperations trackedDonationId={trackedDonationId} inventory={editor.inventory.data} inventoryStatus={editor.inventory.status} />
    </section>
  );
}
