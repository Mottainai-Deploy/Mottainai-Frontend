import { useCallback, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import ReusableTable from '@/components/ReusableTable';
import TransferDetails from '@/components/TransferDetails';
import { useApiQuery } from '@/hooks/useApiQuery';
import { getTransfers } from '@/services/transferService';
import { currentMonthRange, operationDateParams } from '@/utils/operationDateRange';
import { formatCountDate } from '@/utils/inventoryPresentation';
import { transferStatusLabels } from '@/utils/transferApiValidation';
import type { ApiTransfer, TransferListState } from '@/types/transfer-api.types';
import type { ReusableTableColumn } from '@/types/reusable-table.types';
import styles from '@/styles/operations.module.css';

const columns: ReusableTableColumn<ApiTransfer>[] = [
  { id: 'id', header: 'Transferência', renderCell: (item) => item.id },
  { id: 'date', header: 'Solicitação', renderCell: (item) => formatCountDate(item.requestDate) },
  { id: 'source', header: 'Loja de origem', renderCell: (item) => item.sourceStoreId },
  { id: 'destination', header: 'Loja de destino', renderCell: (item) => item.destinationStoreId },
  { id: 'status', header: 'Status', renderCell: (item) => transferStatusLabels[item.status] },
  { id: 'employee', header: 'Funcionário', renderCell: (item) => item.employeeId },
  { id: 'open', header: 'Ação', renderCell: (item) => <Link to={`/stock/transfers?id=${item.id}`} onClick={() => window.requestAnimationFrame(() => document.getElementById('transfer-detail-title')?.focus())}>Abrir transferência {item.id}</Link> },
];

export default function StockTransfers() {
  const [params] = useSearchParams();
  const selectedId = params.get('id');
  const [state, setState] = useState<TransferListState>(() => {
    const range = currentMonthRange();
    return { range, appliedRange: range, error: '', search: '', revision: 0 };
  });
  const load = useCallback((signal: AbortSignal) => getTransfers(state.appliedRange, signal), [state.appliedRange]);
  const query = useApiQuery(load, [], state.revision);
  const onChanged = useCallback(() => setState((previous) => ({ ...previous, revision: previous.revision + 1 })), []);
  const search = state.search.trim().toLocaleLowerCase('pt-BR');
  const filtered = query.data.filter((item) => [item.id, item.sourceStoreId, item.destinationStoreId, transferStatusLabels[item.status], item.observation ?? ''].join(' ').toLocaleLowerCase('pt-BR').includes(search));
  return <section className={styles.page} aria-labelledby="transfers-title">
    <h1 id="transfers-title">Transferências entre lojas</h1>
    <Link className={styles.link} to="/stock/transfers/new">Nova transferência</Link>
    <form className={styles.card} noValidate onSubmit={(event) => {
      event.preventDefault();
      try {
        operationDateParams(state.range);
        setState((previous) => ({ ...previous, appliedRange: { ...previous.range }, error: '' }));
      } catch (error) { setState((previous) => ({ ...previous, error: error instanceof Error ? error.message : 'Período inválido.' })); }
    }}>
      <div className={styles.grid}>
        <label className={styles.field} htmlFor="transfers-from">Data inicial
          <input id="transfers-from" type="date" value={state.range.from} aria-invalid={Boolean(state.error)} aria-describedby={state.error ? 'transfers-range-error' : undefined} onChange={(event) => setState((previous) => ({ ...previous, range: { ...previous.range, from: event.target.value }, error: '' }))} />
        </label>
        <label className={styles.field} htmlFor="transfers-to">Data final
          <input id="transfers-to" type="date" value={state.range.to} aria-invalid={Boolean(state.error)} aria-describedby={state.error ? 'transfers-range-error' : undefined} onChange={(event) => setState((previous) => ({ ...previous, range: { ...previous.range, to: event.target.value }, error: '' }))} />
        </label>
      </div>
      <div className={styles.actions}><button type="submit">Aplicar período</button><button type="button" onClick={onChanged}>Atualizar histórico</button></div>
      {state.error && <p id="transfers-range-error" role="alert">{state.error}</p>}
    </form>
    <label className={styles.field} htmlFor="transfer-search">Buscar por número, loja, status ou observação
      <input id="transfer-search" type="search" value={state.search} onChange={(event) => setState((previous) => ({ ...previous, search: event.target.value }))} />
    </label>
    <p>Período consultado: {state.appliedRange.from.split('-').reverse().join('/')} a {state.appliedRange.to.split('-').reverse().join('/')}.</p>
    {query.status === 'loading' && <p role="status">Carregando transferências…</p>}
    {query.status === 'error' && <p role="alert">{query.error}</p>}
    {query.status === 'success' && <>
      <p role="status">{filtered.length === 1 ? '1 transferência encontrada.' : `${filtered.length} transferências encontradas.`}</p>
      <ReusableTable title="Histórico de transferências" columns={columns} data={filtered} rowKey={(item) => item.id} emptyMessage="Nenhuma transferência encontrada no período e filtro." />
    </>}
    {selectedId && <TransferDetails key={selectedId} id={selectedId} onChanged={onChanged} />}
  </section>;
}
