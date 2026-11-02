import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import ExecutionItems from '@/components/ExecutionItems';
import { useSuggestedExecution } from '@/hooks/useSuggestedExecution';
import type { SuggestedExecutionProps } from '@/types/suggested-execution.types';
import { actionTypeLabels, alertPriorityLabels } from '@/utils/alertPresentation';
import { executionEffects, executionEntityLabels, promotionTypeLabels, usesExecutionBatches } from '@/utils/suggestedExecutionValidation';
import styles from '@/styles/operations.module.css';

export default function SuggestedExecution(props: SuggestedExecutionProps) {
  const editor = useSuggestedExecution(props);
  const { state } = editor;
  const { draft, context, pending, result } = state;
  const type = props.action.actionType;
  const title = useRef<HTMLHeadingElement>(null);
  const reviewTitle = useRef<HTMLHeadingElement>(null);
  const feedback = useRef<HTMLParagraphElement>(null);
  const reviewButton = useRef<HTMLButtonElement>(null);
  useEffect(() => { title.current?.focus(); }, []);
  useEffect(() => { if (pending && !state.uncertain) reviewTitle.current?.focus(); }, [pending, state.uncertain]);
  useEffect(() => { if (state.error) feedback.current?.focus(); }, [state.error]);
  useEffect(() => { if (result) title.current?.focus(); }, [result]);
  return <section className={styles.card} aria-labelledby="execution-title">
    <h2 id="execution-title" ref={title} tabIndex={-1}>Executar ação {props.action.id}: {actionTypeLabels[type]}</h2>
    <p>{executionEffects[type]}</p>
    <p>Os itens precisam ser informados: a sugestão da API não contém produtos, lotes ou quantidades para preencher automaticamente.</p>
    {state.loading && <p role="status">Carregando opções para a operação…</p>}
    {!state.loading && context && !pending && !result && <p role="status">Opções consultadas no servidor.</p>}
    {state.error && <p role="alert" tabIndex={-1} ref={feedback}>{state.error}</p>}
    {!state.loading && !context && <button type="button" onClick={editor.reload}>Tentar consultar opções novamente</button>}
    {context && !result && <form onSubmit={(event) => { event.preventDefault(); editor.review(); }}>
      <fieldset className={styles.fields} disabled={editor.locked}>
        <legend>Dados para executar a sugestão</legend>
        <p>Loja de origem: {context.profile.storeId}.</p>
        <div className={styles.grid}>
          {type === 'CREATE_PURCHASE_ORDER' && <>
            <div className={styles.field}><label htmlFor="execution-supplier">Fornecedor</label><select id="execution-supplier" required value={draft.supplierId} onChange={(event) => editor.change('supplierId', event.target.value)}><option value="">Selecione</option>{context.suppliers.filter((supplier) => supplier.active).map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.tradeName}</option>)}</select></div>
            <div className={styles.field}><label htmlFor="execution-delivery">Entrega prevista (opcional)</label><input id="execution-delivery" type="date" value={draft.expectedDeliveryDate} onChange={(event) => editor.change('expectedDeliveryDate', event.target.value)} /></div>
          </>}
          {type === 'CREATE_TRANSFER' && <div className={styles.field}><label htmlFor="execution-destination">Loja de destino{context.storeListAvailable ? '' : ' (identificador)'}</label>
            {context.storeListAvailable ? <select id="execution-destination" required value={draft.destinationStoreId} onChange={(event) => editor.change('destinationStoreId', event.target.value)}><option value="">Selecione</option>{context.stores.filter((store) => store.active && store.id !== context.profile.storeId).map((store) => <option key={store.id} value={store.id}>{store.name} — {store.id}</option>)}</select>
              : <><input id="execution-destination" inputMode="numeric" required aria-describedby="execution-store-note" value={draft.destinationStoreId} onChange={(event) => editor.change('destinationStoreId', event.target.value)} /><p id="execution-store-note">Sua conta não pode listar lojas. Informe o identificador conhecido; a API validará o destino.</p></>}
          </div>}
          {type === 'CREATE_DONATION' && <div className={styles.field}><label htmlFor="execution-institution">Instituição destinatária</label><input id="execution-institution" required maxLength={150} value={draft.institution} onChange={(event) => editor.change('institution', event.target.value)} /></div>}
          {type === 'CREATE_DISPOSAL' && <div className={styles.field}><label htmlFor="execution-reason">Motivo do descarte</label><input id="execution-reason" required maxLength={100} value={draft.reason} onChange={(event) => editor.change('reason', event.target.value)} /></div>}
          {type === 'CREATE_PROMOTION' && <>
            <div className={styles.field}><label htmlFor="execution-name">Nome da promoção</label><input id="execution-name" required maxLength={150} value={draft.name} onChange={(event) => editor.change('name', event.target.value)} /></div>
            <div className={styles.field}><label htmlFor="execution-promotion-type">Tipo de promoção</label><select id="execution-promotion-type" required value={draft.promotionType} onChange={(event) => editor.change('promotionType', event.target.value)}><option value="">Selecione</option>{Object.entries(promotionTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
            <div className={styles.field}><label htmlFor="execution-start">Início da promoção (horário local)</label><input id="execution-start" type="datetime-local" required value={draft.startsAt} onChange={(event) => editor.change('startsAt', event.target.value)} /></div>
            <div className={styles.field}><label htmlFor="execution-end">Fim da promoção (horário local)</label><input id="execution-end" type="datetime-local" required value={draft.endsAt} onChange={(event) => editor.change('endsAt', event.target.value)} /></div>
            <div className={styles.field}><label htmlFor="execution-description">Descrição (opcional)</label><textarea id="execution-description" maxLength={2000} value={draft.description} onChange={(event) => editor.change('description', event.target.value)} /></div>
          </>}
          {type !== 'CREATE_PROMOTION' && type !== 'CREATE_REPLENISHMENT' && <div className={styles.field}><label htmlFor="execution-observation">Observação (opcional)</label><textarea id="execution-observation" maxLength={2000} value={draft.observation} onChange={(event) => editor.change('observation', event.target.value)} /></div>}
        </div>
        <ExecutionItems type={type} draft={draft} context={context} onChange={editor.changeItem} onAdd={editor.addItem} onRemove={editor.removeItem} />
        <button type="submit" ref={reviewButton}>Revisar execução</button>
      </fieldset>
    </form>}
    {pending && context && <section className={styles.card} aria-labelledby="execution-review-title">
      <h2 id="execution-review-title" ref={reviewTitle} tabIndex={-1}>Revisar execução da ação {props.action.id}</h2>
      <p>{executionEffects[type]}</p>
      <p>{type === 'CREATE_PURCHASE_ORDER' ? `Fornecedor: ${context.suppliers.find((supplier) => supplier.id === draft.supplierId)?.tradeName}. Entrega prevista: ${pending.payload.expectedDeliveryDate || 'não informada'}.`
        : type === 'CREATE_TRANSFER' ? `Destino: loja ${pending.payload.destinationStoreId}.`
          : type === 'CREATE_DONATION' ? `Instituição: ${pending.payload.institution}.`
            : type === 'CREATE_DISPOSAL' ? `Motivo: ${pending.payload.reason}.`
              : type === 'CREATE_PROMOTION' ? `Promoção: ${pending.payload.name}. Tipo: ${promotionTypeLabels[draft.promotionType]}. De ${draft.startsAt.replace('T', ' ')} a ${draft.endsAt.replace('T', ' ')}.` : 'Pré-lista de reposição.'}</p>
      {pending.payload.description && <p>Descrição: {pending.payload.description}</p>}
      {pending.payload.observation && <p>Observação: {pending.payload.observation}</p>}
      {pending.payload.items.map((item, index) => <p key={draft.items[index].id}>
        {usesExecutionBatches(type) ? (() => { const row = context.inventory.find((entry) => entry.batchId === item.batchId); return `${row?.productName} — lote ${row?.batchCode} (${item.batchId})`; })() : context.products.find((product) => product.id === item.productId)?.name}:
        {item.quantity !== undefined ? ` quantidade ${item.quantity.toLocaleString('pt-BR')}` : ''}{item.requestedQuantity !== undefined ? ` quantidade solicitada ${item.requestedQuantity.toLocaleString('pt-BR')}` : ''}
        {item.unitCost !== undefined ? `; custo unitário R$ ${item.unitCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''}{item.originalPrice !== undefined ? `; preço original R$ ${item.originalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}; promocional R$ ${item.promotionalPrice?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}; quantidade disponível ${item.quantityAvailable ?? 'não informada'}` : ''}
        {item.priority ? `; prioridade ${alertPriorityLabels[item.priority]}` : ''}.
      </p>)}
      {state.uncertain && <p>Os dados e a chave permanecem os mesmos. O reenvio recupera uma execução já registrada ou tenta registrar esta mesma execução.</p>}
      <div className={styles.actions}><button type="button" disabled={state.busy} onClick={() => void editor.confirm()}>{state.uncertain ? 'Reenviar a mesma execução' : 'Confirmar execução'}</button>
        {!state.uncertain && <button type="button" disabled={state.busy} onClick={() => { editor.cancelReview(); requestAnimationFrame(() => reviewButton.current?.focus()); }}>Voltar sem executar</button>}
      </div>
    </section>}
    {state.busy && <p role="status">Executando sugestão…</p>}
    {result && <><p role="status">Execução confirmada pelo servidor. Registro criado: {executionEntityLabels[result.entityType] ?? result.entityType}, identificador {result.entityId}. Ação {result.suggestedAction.id} executada.</p>
      {result.entityType === 'transfer' && <Link className={styles.link} to={`/stock/transfers?id=${result.entityId}`}>Abrir transferência {result.entityId}</Link>}
      {result.entityType === 'purchase_order' && <Link className={styles.link} to={`/stock?purchaseOrderId=${result.entityId}`}>Acompanhar pedido de compra {result.entityId}</Link>}
      {result.entityType === 'promotion' && <Link className={styles.link} to={`/products?promotionId=${result.entityId}`}>Acompanhar promoção {result.entityId}</Link>}
      {result.entityType === 'donation' && <Link className={styles.link} to={`/stock/damages?donationId=${result.entityId}`}>Acompanhar doação {result.entityId}</Link>}
      {result.entityType === 'replenishment_pre_list' && <Link className={styles.link} to={`/stock?preListId=${result.entityId}`}>Acompanhar pré-lista {result.entityId}</Link>}
      <button type="button" onClick={props.onCompleted}>Concluir e atualizar alerta</button>
    </>}
    {!result && <button type="button" disabled={state.busy} onClick={props.onClose}>{state.uncertain ? 'Sair e consultar estado do alerta' : 'Voltar ao alerta'}</button>}
    {!result && <p>Se sair após enviar sem confirmação, consulte o alerta antes de iniciar outra tentativa. A chave desta tela não é preservada após sair.</p>}
  </section>;
}
