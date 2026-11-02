import ReusableTable from '@/components/ReusableTable';
import { useTransferDetails } from '@/hooks/useTransferDetails';
import type { ApiTransfer, TransferDetailProps } from '@/types/transfer-api.types';
import type { ReusableTableColumn } from '@/types/reusable-table.types';
import { formatCountDate } from '@/utils/inventoryPresentation';
import { transferStatusLabels, transferActionLabels, transferActionDescriptions } from '@/utils/transferApiValidation';
import styles from '@/styles/operations.module.css';

const columns: ReusableTableColumn<ApiTransfer['items'][number]>[] = [
  { id: 'batch', header: 'Lote', renderCell: (item) => item.batchId },
  { id: 'quantity', header: 'Quantidade transferida', renderCell: (item) => item.transferredQuantity.toLocaleString('pt-BR') },
];

export default function TransferDetails(props: TransferDetailProps) {
  const editor = useTransferDetails(props);
  const { transfer, state } = editor;
  return <section className={`${styles.page} ${styles.card}`} aria-labelledby="transfer-detail-title">
    <h2 id="transfer-detail-title" tabIndex={-1}>Transferência {props.id}</h2>
    {!transfer && editor.query.status === 'loading' && <p role="status">Carregando transferência…</p>}
    {!transfer && editor.query.status === 'error' && <p role="alert">{editor.query.error}</p>}
    {editor.profile.status === 'error' && <p role="alert">{editor.profile.error}</p>}
    {editor.profile.status === 'loading' && <p role="status">Consultando ações disponíveis para sua loja…</p>}
    {state.message && <p id={`transfer-feedback-${props.id}`} tabIndex={-1} className={styles.feedback} role={state.failed ? 'alert' : 'status'}>{state.message}</p>}
    <button type="button" disabled={state.busy} onClick={editor.reload}>Consultar estado da transferência</button>
    {transfer && <>
      <p role="status">Status: {transferStatusLabels[transfer.status]}.</p>
      <p>Origem: loja {transfer.sourceStoreId}. Destino: loja {transfer.destinationStoreId}. Funcionário responsável: {transfer.employeeId}.</p>
      <p>Solicitada em {formatCountDate(transfer.requestDate)}{transfer.completionDate ? `. Concluída em ${formatCountDate(transfer.completionDate)}` : ''}.</p>
      <p>Observação: {transfer.observation || 'Não informada'}.</p>
      <ReusableTable title="Lotes da transferência" columns={columns} data={transfer.items} rowKey={(item) => item.batchId} />
      {state.uncertain && <p role="alert">Consulte o estado antes de repetir qualquer ação de estoque.</p>}
      {!state.action && <div className={styles.actions}>
        {editor.actions.map((action) => <button id={`transfer-action-${action}-${props.id}`} key={action} type="button" disabled={state.busy} onClick={() => editor.review(action)}>{transferActionLabels[action]}</button>)}
      </div>}
      {state.action && <section className={styles.card} aria-labelledby={`transfer-action-review-${props.id}`}>
        <h2 id={`transfer-action-review-${props.id}`} tabIndex={-1}>Revisar: {transferActionLabels[state.action]}</h2>
        <p>{transferActionDescriptions[state.action]}</p>
        <p>Confira os lotes e quantidades acima antes de confirmar.</p>
        <div className={styles.actions}>
          <button type="button" disabled={state.busy} onClick={editor.confirm}>Confirmar operação</button>
          <button type="button" disabled={state.busy} onClick={editor.cancelReview}>Voltar sem executar</button>
        </div>
      </section>}
    </>}
  </section>;
}
