import ReusableTable from '@/components/ReusableTable';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import type { ApiAuditLog } from '@/types/audit-api.types';
import type { ReusableTableColumn } from '@/types/reusable-table.types';
import { formatCountDate } from '@/utils/inventoryPresentation';
import styles from '@/styles/operations.module.css';

const columns: ReusableTableColumn<ApiAuditLog>[] = [
  { id: 'date', header: 'Data e hora', renderCell: (row) => formatCountDate(row.operationDate) },
  { id: 'user', header: 'ID do usuário', renderCell: (row) => row.userId ?? 'Sistema' },
  { id: 'table', header: 'Tabela', renderCell: (row) => row.tableAffected },
  { id: 'operation', header: 'Operação', renderCell: (row) => row.operation },
  { id: 'record', header: 'ID do registro', renderCell: (row) => row.recordId },
];

export default function EmployeeAudit() {
  const { state, setState, query, search } = useAuditLogs();
  return <section className={styles.card} aria-labelledby="staff-audit-title">
    <h2 id="staff-audit-title">Auditoria da empresa</h2>
    <p>Registros do banco, com consulta restrita a administradores. Selecione até seis meses.</p>
    <form onSubmit={(e) => { e.preventDefault(); search(); }} className={styles.fields}>
      <div className={styles.grid}>
        <div className={styles.field}><label htmlFor="audit-from">Data inicial</label><input id="audit-from" type="date" required value={state.range.from} onChange={(e) => setState((s) => ({ ...s, range: { ...s.range, from: e.target.value } }))} /></div>
        <div className={styles.field}><label htmlFor="audit-to">Data final</label><input id="audit-to" type="date" required value={state.range.to} onChange={(e) => setState((s) => ({ ...s, range: { ...s.range, to: e.target.value } }))} /></div>
      </div><button type="submit">Consultar auditoria</button>
    </form>
    {state.error && <p role="alert">{state.error}</p>}
    {query.status === 'loading' && <p role="status">Carregando auditoria…</p>}
    {query.status === 'error' && <p role="alert">{query.error}</p>}
    {query.status === 'success' && <><p role="status">Consulta concluída: {query.data.length} registros.</p><ReusableTable title="Log de auditoria" columns={columns} data={query.data} rowKey={(row) => row.auditId} emptyMessage="Nenhum registro no período consultado." /></>}
  </section>;
}
