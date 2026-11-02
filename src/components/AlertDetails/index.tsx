import { useEffect, useRef, useState } from 'react';
import { useAlertDetails } from '@/hooks/useAlertDetails';
import type { AlertDetailsProps, AlertStatus } from '@/types/alert-api.types';
import { actionStatusLabels, actionTypeLabels, alertPriorityLabels, alertStatusLabels, alertTypeLabels, validateAlertStatus } from '@/utils/alertPresentation';
import { formatCountDate } from '@/utils/inventoryPresentation';
import styles from '@/styles/operations.module.css';
import SuggestedExecution from '@/components/SuggestedExecution';

export default function AlertDetails(props: AlertDetailsProps) {
  const editor = useAlertDetails(props);
  const { state } = editor;
  const [form, setForm] = useState<{ status: AlertStatus | ''; executionId: number | null }>({ status: '', executionId: null });
  const heading = useRef<HTMLHeadingElement>(null);
  const reviewHeading = useRef<HTMLHeadingElement>(null);
  const feedback = useRef<HTMLParagraphElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  useEffect(() => { if (state.review) reviewHeading.current?.focus(); }, [state.review]);
  useEffect(() => { if (state.error) feedback.current?.focus(); }, [state.error]);
  useEffect(() => { if (state.notice.startsWith('Operação confirmada')) heading.current?.focus(); }, [state.notice]);
  const alert = state.data?.alert;
  const review = state.review;
  const selectedAction = review?.kind === 'decision' ? state.data?.actions.find((item) => item.id === review.id) : null;
  const executionAction = state.data?.actions.find((item) => item.id === form.executionId);
  if (executionAction && state.data) return <SuggestedExecution key={executionAction.id} action={executionAction} storeId={state.data.alert.storeId}
    onClose={() => { setForm({ status: '', executionId: null }); editor.reload(); requestAnimationFrame(() => heading.current?.focus()); }}
    onCompleted={() => { setForm({ status: '', executionId: null }); editor.reload(); props.onChanged(); requestAnimationFrame(() => heading.current?.focus()); }} />;
  return <section className={styles.card} aria-labelledby="alert-detail-title">
    <h2 id="alert-detail-title" ref={heading} tabIndex={-1}>Alerta {props.id}</h2>
    <button type="button" disabled={state.busy || state.loading} onClick={editor.reload}>Consultar estado do alerta</button>
    {state.loading && <p role="status">Carregando alerta e ações sugeridas…</p>}
    {state.error && <p role="alert" tabIndex={-1} ref={feedback}>{state.error}</p>}
    {state.notice && <p role="status">{state.notice}</p>}
    {state.uncertain && <p>Novas alterações ficam bloqueadas até a consulta concluir com sucesso. Se sair desta tela, confira o estado antes de repetir a operação.</p>}
    {alert && !state.loading && <>
      <h3>{alert.title}</h3><p>{alert.description || 'Sem descrição.'}</p>
      <p>Tipo: {alertTypeLabels[alert.alertType] ?? alert.alertType}. Prioridade: {alertPriorityLabels[alert.priority] ?? alert.priority}.</p>
      <p>Status: {alertStatusLabels[alert.status] ?? alert.status}. Loja: {alert.storeId}.</p>
      <p>Gerado em {formatCountDate(alert.generatedAt)}.{alert.resolvedAt ? ` Resolvido em ${formatCountDate(alert.resolvedAt)}.` : ''}</p>
      <div className={styles.field}><label htmlFor="alert-new-status">Novo status do alerta</label>
        <select id="alert-new-status" disabled={editor.blocked || !!review} value={form.status} onChange={(event) => {
          const status = event.target.value;
          if (!status) { setForm({ status: '', executionId: null }); return; }
          validateAlertStatus(status); setForm({ status, executionId: null });
        }}><option value="">Selecione um status</option>{(Object.keys(alertStatusLabels) as AlertStatus[]).filter((status) => status !== alert.status).map((status) => <option key={status} value={status}>{alertStatusLabels[status]}</option>)}</select>
        <button type="button" disabled={editor.blocked || !!review || !form.status || form.status === alert.status} onClick={(event) => { if (form.status) editor.review({ kind: 'status', status: form.status }, event.currentTarget); }}>Revisar alteração de status</button>
      </div>
      <h3>Ações sugeridas pelo servidor</h3>
      <p>A aprovação registra a decisão. Para executar uma sugestão pendente ou aprovada, informe os dados da operação e revise seus efeitos.</p>
      {state.data?.actions.length === 0 && <p>Nenhuma ação sugerida para este alerta.</p>}
      {state.data?.actions.map((action) => <article key={action.id} className={styles.card} aria-labelledby={`suggestion-title-${action.id}`}>
        <h4 id={`suggestion-title-${action.id}`}>{actionTypeLabels[action.actionType] ?? action.actionType} — ação {action.id}</h4>
        <p>{action.description || 'Sem descrição.'}</p>
        <p>Prioridade: {alertPriorityLabels[action.priority] ?? action.priority}. Status: {actionStatusLabels[action.status] ?? action.status}.</p>
        <p>Gerada em {formatCountDate(action.generatedAt)}.</p>
        {action.status === 'PENDING' && <div className={styles.actions}>
          <button type="button" disabled={editor.blocked || !!review} onClick={(event) => editor.review({ kind: 'decision', id: action.id, decision: 'APPROVED' }, event.currentTarget)}>Revisar aprovação da ação {action.id}</button>
          <button type="button" disabled={editor.blocked || !!review} onClick={(event) => editor.review({ kind: 'decision', id: action.id, decision: 'REJECTED' }, event.currentTarget)}>Revisar rejeição da ação {action.id}</button>
        </div>}
        {(action.status === 'PENDING' || action.status === 'APPROVED') && <button type="button" disabled={editor.blocked || !!review} onClick={() => setForm((current) => ({ ...current, executionId: action.id }))}>Preparar execução da ação {action.id}</button>}
      </article>)}
      {review && <section className={styles.card} aria-labelledby="alert-review-title">
        <h2 id="alert-review-title" tabIndex={-1} ref={reviewHeading}>Revisar operação</h2>
        {review.kind === 'status' ? <p>Alterar o alerta “{alert.title}” de {alertStatusLabels[alert.status]} para {alertStatusLabels[review.status]}.</p>
          : <><p>{review.decision === 'APPROVED' ? 'Aprovar' : 'Rejeitar'} a ação {review.id}: {selectedAction?.description || (selectedAction && actionTypeLabels[selectedAction.actionType])}.</p><p>Esta decisão não cria a operação sugerida nem altera o saldo do estoque.</p></>}
        <div className={styles.actions}><button type="button" disabled={state.busy} onClick={() => void editor.confirm()}>Confirmar operação</button><button type="button" disabled={state.busy} onClick={editor.cancelReview}>Voltar sem confirmar</button></div>
      </section>}
    </>}
    {state.busy && <p role="status">Registrando operação…</p>}
  </section>;
}
