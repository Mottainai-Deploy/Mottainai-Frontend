import type { BatchStatusProps } from '@/types/batch-status.types';
import { useBatchStatus } from '@/hooks/useBatchStatus';
import ConfirmedAction from '@/components/ConfirmedAction';
import styles from '@/styles/operations.module.css';

export default function BatchStatus(props: BatchStatusProps) {
  const editor = useBatchStatus(props);
  const { state, batches } = editor;
  return <section className={styles.page} aria-labelledby="batch-status-title">
    <h2 id="batch-status-title">Ativar ou desativar lote</h2>
    <p>Altera o cadastro do lote sem modificar as quantidades de estoque. Esta ação exige permissão de administrador.</p>
    {batches.status === 'loading' && <p role="status">Carregando lotes ativos…</p>}
    {batches.status === 'error' && <p role="alert">{batches.error}</p>}
    <div className={styles.card}>
      <label htmlFor="batch-status-id">Identificador do lote</label>
      <input id="batch-status-id" inputMode="numeric" list="batch-status-options" value={state.id} disabled={state.busy || state.uncertain} onChange={event => editor.changeId(event.target.value)} aria-describedby="batch-status-hint" />
      <datalist id="batch-status-options">{batches.data.map(batch => <option key={batch.id} value={batch.id}>{batch.batchCode}</option>)}</datalist>
      <p id="batch-status-hint">Escolha um lote ativo ou informe o identificador do lote que deseja reativar.</p>
      <label htmlFor="batch-status-active">Status desejado</label>
      <select id="batch-status-active" value={String(state.active)} disabled={state.busy || state.uncertain} onChange={event => editor.changeActive(event.target.value === 'true')}>
        <option value="false">Inativo</option><option value="true">Ativo</option>
      </select>
      <ConfirmedAction key={`${state.id}-${state.active}`} label="Alterar status do lote" effect={`Confirmar lote ${state.id} como ${state.active ? 'ativo' : 'inativo'}? Não haverá alteração de saldo.`}
        execute={editor.execute} verify={editor.verify} validate={editor.validate} disabled={state.busy || !/^[1-9]\d*$/.test(state.id)} onBusyChange={editor.busy} onUncertainChange={editor.uncertain} />
      {state.confirmed && <p role="status">{state.confirmed}</p>}
    </div>
  </section>;
}
