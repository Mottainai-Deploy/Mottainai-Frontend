import { useReplenishmentOperations } from '@/hooks/useReplenishmentOperations';
import { preListStatusLabels } from '@/utils/operationalPresentation';
import { formatCountDate } from '@/utils/inventoryPresentation';
import type { ReplenishmentPriority } from '@/types/replenishment-api.types';
import styles from '@/styles/operations.module.css';

export interface ReplenishmentOperationsProps { trackedPreListId: number | null; }
const priorityLabels: Record<ReplenishmentPriority, string> = { LOW: 'Baixa', MEDIUM: 'Média', HIGH: 'Alta', CRITICAL: 'Crítica' };

export default function ReplenishmentOperations({ trackedPreListId }: ReplenishmentOperationsProps) {
  const editor = useReplenishmentOperations(trackedPreListId);
  const { state, query, preListDetail, executionDetail } = editor;
  const disabled = state.busy || state.uncertain || query.status !== 'success';
  const products = new Map(query.data.products.map((product) => [product.id, product]));
  return <section className={styles.page} aria-labelledby="replenishment-operations-title">
    <h2 id="replenishment-operations-title">Reposição</h2>
    <p>Gerar uma pré-lista não movimenta estoque. A entrada ocorre somente ao executar uma reposição.</p>
    {query.status === 'loading' && <p role="status">Carregando pré-listas, estoque e reposições…</p>}
    {query.status === 'error' && <p role="alert">{query.error}</p>}
    {query.status === 'success' && <p role="status">Consulta concluída: {query.data.preLists.length} pré-lista(s) e {query.data.executions.length} execução(ões).</p>}
    {state.feedback && <p role={state.feedbackIsError ? 'alert' : 'status'}>{state.feedback}</p>}
    <form className={styles.card} aria-label="Consultar reposições por período" onSubmit={(event) => { event.preventDefault(); editor.applyRange(); }}>
      <div className={styles.grid}><div className={styles.field}><label htmlFor="replenishments-from">Data inicial</label><input id="replenishments-from" type="date" value={state.range.from} onChange={(event) => editor.changeRange('from', event.target.value)} /></div>
        <div className={styles.field}><label htmlFor="replenishments-to">Data final</label><input id="replenishments-to" type="date" value={state.range.to} onChange={(event) => editor.changeRange('to', event.target.value)} /></div></div>
      <div className={styles.actions}><button type="submit" disabled={state.busy}>Aplicar período</button><button type="button" disabled={state.busy} onClick={editor.refresh}>Atualizar histórico e estoque</button></div>
    </form>

    {query.status === 'success' && <div className={styles.grid}>
      <section className={styles.card} aria-labelledby="pre-list-title"><h3 id="pre-list-title">Pré-listas</h3>
        <button type="button" disabled={disabled} onClick={editor.askGenerate}>Gerar pré-lista</button>
        {query.data.preLists.length === 0 ? <p>Nenhuma pré-lista disponível.</p> : <ul>{query.data.preLists.map((item) => <li key={item.id}>
          <button type="button" disabled={state.busy} onClick={() => editor.selectPreList(item.id)}>Pré-lista {item.id} — {preListStatusLabels[item.status]}</button>
          <span> {formatCountDate(item.generatedAt)}; {item.items.length} produto(s).</span>
        </li>)}</ul>}
      </section>
      <section className={styles.card} aria-labelledby="replenishment-history-title"><h3 id="replenishment-history-title">Reposições executadas</h3>
        {query.data.executions.length === 0 ? <p>Nenhuma reposição executada no período.</p> : <ul>{query.data.executions.map((item) => <li key={item.id}>
          <button type="button" disabled={state.busy} onClick={() => editor.selectExecution(item.id)}>Reposição {item.id} — pré-lista {item.preListId}</button>
          <span> {formatCountDate(item.startDate)}; {item.items.length} item(ns).</span>
        </li>)}</ul>}
      </section>
    </div>}

    {state.reviewing && state.pending?.kind === 'generate' && <section className={styles.card} aria-labelledby="pre-list-review-title"><h3 id="pre-list-review-title" tabIndex={-1}>Revisar geração da pré-lista</h3>
      <p>A geração consulta o servidor e registra uma pré-lista. Não executa reposição e não altera saldo.</p>
      {state.uncertain && <p>A resposta foi inconclusiva. A mesma chave será mantida se você reenviar.</p>}
      <div className={styles.actions}>{!state.uncertain && <button type="button" disabled={state.busy} onClick={editor.confirm}>Confirmar geração</button>}{state.uncertain && <button type="button" disabled={state.busy} onClick={editor.retry}>Reenviar a mesma geração</button>}{!state.uncertain && <button type="button" disabled={state.busy} onClick={editor.cancelReview}>Voltar</button>}</div>
    </section>}

    {preListDetail.status === 'loading' && <p role="status">Consultando pré-lista no servidor…</p>}
    {preListDetail.status === 'error' && <p role="alert">{preListDetail.error}</p>}
    {preListDetail.status === 'success' && preListDetail.data && <section className={styles.card} aria-labelledby="pre-list-detail-title"><h3 id="pre-list-detail-title">Pré-lista {preListDetail.data.id}</h3>
      <p>Status: {preListStatusLabels[preListDetail.data.status]}. Gerada em {formatCountDate(preListDetail.data.generatedAt)}. A consulta não executa reposição.</p>
      {preListDetail.data.items.map((item) => <p key={item.id}>{products.get(item.productId)?.name ?? `Produto ${item.productId}`}: quantidade sugerida {item.suggestedQuantity.toLocaleString('pt-BR')}; prioridade {priorityLabels[item.priority]}.</p>)}
      {['GENERATED', 'IN_PROGRESS'].includes(preListDetail.data.status) && preListDetail.data.items.length > 0 && <button type="button" disabled={disabled} onClick={() => editor.startExecution(preListDetail.data!)}>Preparar execução da reposição</button>}
      <button type="button" disabled={state.busy} onClick={() => void editor.verifyPreList(preListDetail.data!.id)}>Consultar pré-lista novamente</button>
    </section>}

    {state.draft && !state.reviewing && <form className={styles.card} aria-labelledby="replenishment-form-title" onSubmit={(event) => { event.preventDefault(); editor.submitExecution(); }}>
      <h3 id="replenishment-form-title">Executar pré-lista {state.draft.preListId}</h3><p>Selecione o lote de cada produto e informe a quantidade efetivamente reposta. O servidor confere saldos e permissões.</p>
      <fieldset className={styles.fields} disabled={disabled}><legend>Itens da execução</legend>
        <div className={styles.grid}><div className={styles.field}><label htmlFor="replenishment-rating">Avaliação opcional (1 a 5)</label><select id="replenishment-rating" value={state.draft.rating} onChange={(event) => editor.editDraft('rating', event.target.value)}><option value="">Sem avaliação</option>{[1, 2, 3, 4, 5].map((rating) => <option key={rating} value={rating}>{rating}</option>)}</select></div>
          <div className={styles.field}><label htmlFor="replenishment-comment">Comentário (opcional)</label><textarea id="replenishment-comment" value={state.draft.comment} onChange={(event) => editor.editDraft('comment', event.target.value)} /></div></div>
        {state.draft.items.map((item, index) => {
          const usedBatchIds = state.draft?.items.filter((entry) => entry.id !== item.id).map((entry) => entry.batchId).filter(Boolean) ?? [];
          const choices = editor.available.filter((row) => row.productId === item.productId && (!usedBatchIds.includes(String(row.batchId)) || String(row.batchId) === item.batchId));
          return <fieldset className={styles.card} key={item.id}><legend>{products.get(item.productId)?.name ?? `Produto ${item.productId}`} — item {index + 1}</legend><div className={styles.grid}>
            <div className={styles.field}><label htmlFor={`replenishment-batch-${item.id}`}>Lote do produto</label><select id={`replenishment-batch-${item.id}`} required value={item.batchId} onChange={(event) => editor.editItem(item.id, 'batchId', event.target.value)}><option value="">Selecione</option>{choices.map((row) => <option key={row.batchId} value={row.batchId}>{row.batchCode} — saldo consultado {row.currentQuantity.toLocaleString('pt-BR')} {row.unitMeasure}</option>)}</select></div>
            <div className={styles.field}><label htmlFor={`replenishment-quantity-${item.id}`}>Quantidade reposta</label><input id={`replenishment-quantity-${item.id}`} inputMode="decimal" required value={item.replenishedQuantity} onChange={(event) => editor.editItem(item.id, 'replenishedQuantity', event.target.value)} /></div>
          </div><button type="button" disabled={disabled || (state.draft?.items.length ?? 0) < 2} onClick={() => editor.removeItem(item.id)}>Remover lote deste produto</button></fieldset>;
        })}
        {preListDetail.data?.items.map((item) => <button key={item.id} type="button" disabled={disabled} onClick={() => editor.addBatchLine(item.productId)}>Adicionar outro lote de {products.get(item.productId)?.name ?? `produto ${item.productId}`}</button>)}
        <button type="submit">Revisar execução</button>
      </fieldset>
    </form>}

    {state.reviewing && state.pending?.kind === 'execute' && <section className={styles.card} aria-labelledby="replenishment-review-title"><h3 id="replenishment-review-title" tabIndex={-1}>Revisar execução da reposição</h3>
      <p>Pré-lista {state.pending.payload.preListId}; {state.pending.payload.items.length} lote(s). Confirmar registra as quantidades repostas segundo a validação do servidor.</p>
      {state.pending.payload.items.map((item) => { const row = query.data.inventory.find((entry) => entry.batchId === item.batchId); return <p key={item.batchId}>{row ? `${row.productName} — lote ${row.batchCode}` : `Lote ${item.batchId}`}: {item.replenishedQuantity.toLocaleString('pt-BR')} {row?.unitMeasure ?? ''}.</p>; })}
      {state.uncertain && <p>A resposta foi inconclusiva. Os dados e a mesma chave estão preservados para recuperar esta execução.</p>}
      <div className={styles.actions}>{!state.uncertain && <button type="button" disabled={state.busy} onClick={editor.confirm}>Confirmar execução</button>}{state.uncertain && <button type="button" disabled={state.busy} onClick={editor.retry}>Reenviar a mesma execução</button>}{!state.uncertain && <button type="button" disabled={state.busy} onClick={editor.cancelReview}>Voltar sem executar</button>}</div>
    </section>}

    {executionDetail.status === 'loading' && <p role="status">Consultando reposição executada…</p>}
    {executionDetail.status === 'error' && <p role="alert">{executionDetail.error}</p>}
    {executionDetail.status === 'success' && executionDetail.data && <section className={styles.card} aria-labelledby="execution-detail-title"><h3 id="execution-detail-title">Reposição {executionDetail.data.id}</h3>
      <p>Pré-lista {executionDetail.data.preListId}. Início: {formatCountDate(executionDetail.data.startDate)}. Fim: {executionDetail.data.endDate ? formatCountDate(executionDetail.data.endDate) : 'não informado'}.</p>
      {executionDetail.data.items.map((item) => { const row = query.data.inventory.find((entry) => entry.batchId === item.batchId); return <p key={item.id}>{row ? `${row.productName} — lote ${row.batchCode}` : `Lote ${item.batchId}`}: {item.replenishedQuantity.toLocaleString('pt-BR')} {row?.unitMeasure ?? ''}.</p>; })}
      {executionDetail.data.rating !== null && <p>Avaliação: {executionDetail.data.rating} de 5.</p>}{executionDetail.data.comment && <p>{executionDetail.data.comment}</p>}
      <button type="button" disabled={state.busy} onClick={() => void editor.verifyExecution(executionDetail.data!.id)}>Consultar execução novamente</button>
    </section>}
  </section>;
}
