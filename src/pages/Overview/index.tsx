import { Link, useSearchParams } from 'react-router-dom';
import ReusableTable from '@/components/ReusableTable';
import AlertDetails from '@/components/AlertDetails';
import { useAlertDirectory } from '@/hooks/useAlertDirectory';
import type { ApiAlert, AlertStatus } from '@/types/alert-api.types';
import type { ReusableTableColumn } from '@/types/reusable-table.types';
import { alertPriorityLabels, alertStatusLabels, alertTypeLabels } from '@/utils/alertPresentation';
import { formatCountDate } from '@/utils/inventoryPresentation';
import styles from '@/styles/operations.module.css';

const columns: ReusableTableColumn<ApiAlert>[] = [
  { id: 'title', header: 'Alerta', renderCell: (alert) => alert.title },
  { id: 'type', header: 'Tipo', renderCell: (alert) => alertTypeLabels[alert.alertType] ?? alert.alertType },
  { id: 'priority', header: 'Prioridade', renderCell: (alert) => alertPriorityLabels[alert.priority] ?? alert.priority },
  { id: 'status', header: 'Status', renderCell: (alert) => alertStatusLabels[alert.status] ?? alert.status },
  { id: 'date', header: 'Gerado em', renderCell: (alert) => formatCountDate(alert.generatedAt) },
  { id: 'details', header: 'Detalhes', renderCell: (alert) => <Link to={`?alert=${alert.id}`}>Abrir alerta {alert.id}</Link> },
];

export default function Overview() {
  const { state, setState, query, alerts } = useAlertDirectory();
  const [params] = useSearchParams();
  const id = params.get('alert');
  return <section className={styles.page} aria-labelledby="overview-title">
    <h1 id="overview-title">Visão geral do motor</h1>
    <p>Alertas e sugestões registrados no servidor para a loja da sua conta. Esta consulta não gera previsões novas.</p>
    <div className={styles.card}>
      <div className={styles.grid}>
        <div className={styles.field}><label htmlFor="alert-search">Buscar alertas</label><input id="alert-search" value={state.search} onChange={(event) => setState((current) => ({ ...current, search: event.target.value }))} /></div>
        <div className={styles.field}><label htmlFor="alert-status-filter">Filtrar por status</label><select id="alert-status-filter" value={state.status} onChange={(event) => setState((current) => ({ ...current, status: event.target.value }))}><option value="">Todos os status</option>{(Object.keys(alertStatusLabels) as AlertStatus[]).map((status) => <option key={status} value={status}>{alertStatusLabels[status]}</option>)}</select></div>
      </div><button type="button" onClick={() => setState((current) => ({ ...current, reload: current.reload + 1 }))}>Atualizar alertas</button>
    </div>
    {query.status === 'loading' && <p role="status">Carregando alertas da loja…</p>}
    {query.status === 'error' && <p role="alert">{query.error}</p>}
    {query.status === 'success' && <><p role="status">Consulta concluída: {alerts.length} alertas encontrados.</p><ReusableTable title="Alertas da loja" columns={columns} data={alerts} rowKey={(alert) => alert.id} emptyMessage="Nenhum alerta corresponde à consulta." /></>}
    {id !== null && <AlertDetails key={id} id={id} onChanged={() => setState((current) => ({ ...current, reload: current.reload + 1 }))} />}
  </section>;
}
