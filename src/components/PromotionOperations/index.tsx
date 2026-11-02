import ConfirmedAction from '@/components/ConfirmedAction';
import { usePromotionOperations } from '@/hooks/usePromotionOperations';
import { promotionStatusLabels, promotionTypeLabels } from '@/utils/operationalPresentation';
import styles from '@/styles/operations.module.css';

export interface PromotionOperationsProps { trackedPromotionId: number | null; }

function localDate(value: string): string { return value.replace('T', ' '); }

export default function PromotionOperations({ trackedPromotionId }: PromotionOperationsProps) {
  const editor = usePromotionOperations(trackedPromotionId);
  const { state, query, detail } = editor;
  const disabled = state.busy || state.uncertain || query.status !== 'success';
  const promotion = detail.promotion;
  return <section className={styles.page} aria-labelledby="promotion-operations-title">
    <h2 id="promotion-operations-title">Promoções</h2>
    <p>Uma promoção criada pela sugestão fica inativa e pendente de aprovação. Aprovar a sugestão e executar a sugestão são ações distintas.</p>
    {query.status === 'loading' && <p role="status">Carregando promoções e produtos…</p>}
    {query.status === 'error' && <p role="alert">{query.error}</p>}
    {query.status === 'success' && <p role="status">Consulta concluída: {query.data.promotions.length} promoção(ões) encontradas.</p>}
    {state.feedback && <p role={state.feedbackIsError ? 'alert' : 'status'}>{state.feedback}</p>}
    {state.uncertain && <div className={styles.card}><p>A resposta da escrita não foi conclusiva. Atualize a lista e os detalhes antes de iniciar outra alteração.</p><button type="button" disabled={state.busy} onClick={() => void editor.verifyUnknownWrite()}>Consultar promoções no servidor</button></div>}

    {query.status === 'success' && <section className={styles.card} aria-labelledby="promotion-list-title"><h3 id="promotion-list-title">Promoções da loja</h3>
      <div className={styles.field}><label htmlFor="promotion-search">Buscar promoção</label><input id="promotion-search" type="search" value={state.search} onChange={(event) => editor.setSearch(event.target.value)} /></div>
      <button type="button" disabled={disabled} onClick={editor.startCreate}>Criar promoção</button>
      {editor.promotions.length === 0 ? <p>Nenhuma promoção encontrada.</p> : <ul>{editor.promotions.map((item) => <li key={item.id}>
        <button type="button" disabled={state.busy} onClick={() => editor.select(item.id)}>Promoção {item.id}: {item.name} — {promotionStatusLabels[item.status]}</button>
        <span> {item.active ? 'Ativa' : 'Inativa'}; {promotionTypeLabels[item.promotionType]}.</span>
      </li>)}</ul>}
    </section>}

    {state.selectedId === null && !state.editing && !state.reviewing && <form className={styles.card} aria-labelledby="promotion-form-title" onSubmit={(event) => { event.preventDefault(); editor.submitPromotion(); }}>
      <h3 id="promotion-form-title">Cadastrar promoção</h3><fieldset className={styles.fields} disabled={disabled}><legend>Dados da promoção</legend>
        <div className={styles.grid}>
          <div className={styles.field}><label htmlFor="promotion-name">Nome</label><input id="promotion-name" required maxLength={150} value={state.draft.name} onChange={(event) => editor.edit('name', event.target.value)} /></div>
          <div className={styles.field}><label htmlFor="promotion-type">Tipo</label><select id="promotion-type" required value={state.draft.promotionType} onChange={(event) => editor.edit('promotionType', event.target.value)}><option value="">Selecione</option>{Object.entries(promotionTypeLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>
          <div className={styles.field}><label htmlFor="promotion-start">Início (horário local)</label><input id="promotion-start" type="datetime-local" required value={state.draft.startsAt} onChange={(event) => editor.edit('startsAt', event.target.value)} /></div>
          <div className={styles.field}><label htmlFor="promotion-end">Fim (horário local)</label><input id="promotion-end" type="datetime-local" required value={state.draft.endsAt} onChange={(event) => editor.edit('endsAt', event.target.value)} /></div>
          <div className={styles.field}><label htmlFor="promotion-description">Descrição (opcional)</label><textarea id="promotion-description" maxLength={2000} value={state.draft.description} onChange={(event) => editor.edit('description', event.target.value)} /></div>
        </div><button type="submit">Revisar promoção</button>
      </fieldset>
    </form>}

    {state.editing && !state.reviewing && promotion && <form className={styles.card} aria-labelledby="promotion-edit-title" onSubmit={(event) => { event.preventDefault(); editor.submitPromotion(); }}>
      <h3 id="promotion-edit-title">Editar promoção {promotion.id}</h3><fieldset className={styles.fields} disabled={disabled || detail.status !== 'success'}><legend>Dados revisados no servidor</legend>
        <div className={styles.grid}>
          <div className={styles.field}><label htmlFor="promotion-edit-name">Nome</label><input id="promotion-edit-name" required maxLength={150} value={state.draft.name} onChange={(event) => editor.edit('name', event.target.value)} /></div>
          <div className={styles.field}><label htmlFor="promotion-edit-type">Tipo</label><select id="promotion-edit-type" required value={state.draft.promotionType} onChange={(event) => editor.edit('promotionType', event.target.value)}><option value="">Selecione</option>{Object.entries(promotionTypeLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>
          <div className={styles.field}><label htmlFor="promotion-edit-start">Início (horário local)</label><input id="promotion-edit-start" type="datetime-local" required value={state.draft.startsAt} onChange={(event) => editor.edit('startsAt', event.target.value)} /></div>
          <div className={styles.field}><label htmlFor="promotion-edit-end">Fim (horário local)</label><input id="promotion-edit-end" type="datetime-local" required value={state.draft.endsAt} onChange={(event) => editor.edit('endsAt', event.target.value)} /></div>
          <div className={styles.field}><label htmlFor="promotion-edit-description">Descrição</label><textarea id="promotion-edit-description" maxLength={2000} value={state.draft.description} onChange={(event) => editor.edit('description', event.target.value)} /></div>
        </div><div className={styles.actions}><button type="submit">Revisar alterações</button><button type="button" onClick={() => editor.select(promotion.id)}>Cancelar edição</button></div>
      </fieldset>
    </form>}

    {detail.status === 'loading' && <p role="status">Consultando promoção e itens…</p>}
    {detail.status === 'error' && <p role="alert">{detail.error}</p>}
    {detail.status === 'success' && promotion && <section className={styles.card} aria-labelledby="promotion-detail-title">
      <h3 id="promotion-detail-title">{promotion.name}</h3><p>Status: {promotionStatusLabels[promotion.status]}. {promotion.active ? 'Ativa.' : 'Inativa.'} Tipo: {promotionTypeLabels[promotion.promotionType]}.</p>
      <p>Período: {localDate(promotion.startsAt)} a {localDate(promotion.endsAt)}.</p>{promotion.description && <p>{promotion.description}</p>}
      <div className={styles.actions}>
        {promotion.status === 'PENDING_APPROVAL' && <button type="button" disabled={disabled} onClick={() => editor.startEdit(promotion)}>Editar promoção</button>}
        {promotion.status === 'PENDING_APPROVAL' && <ConfirmedAction label={`Aprovar promoção ${promotion.id}`} effect="A aprovação ativa a promoção conforme a regra do servidor. Confira nome, período e itens antes de prosseguir." execute={() => editor.runStatus(promotion.id, 'approve')} verify={() => editor.verify(promotion.id)} disabled={state.busy || state.uncertain} onBusyChange={editor.setBusy} onUncertainChange={editor.setUncertain} />}
        {promotion.status === 'PENDING_APPROVAL' && <ConfirmedAction label={`Rejeitar promoção ${promotion.id}`} effect="A promoção será rejeitada e permanecerá inativa." execute={() => editor.runStatus(promotion.id, 'reject')} verify={() => editor.verify(promotion.id)} disabled={state.busy || state.uncertain} onBusyChange={editor.setBusy} onUncertainChange={editor.setUncertain} />}
        {!['CANCELLED', 'REJECTED', 'EXPIRED'].includes(promotion.status) && <ConfirmedAction label={`Cancelar promoção ${promotion.id}`} effect="A promoção será cancelada e desativada." execute={() => editor.runStatus(promotion.id, 'cancel')} verify={() => editor.verify(promotion.id)} disabled={state.busy || state.uncertain} onBusyChange={editor.setBusy} onUncertainChange={editor.setUncertain} />}
        <ConfirmedAction label={`Excluir promoção ${promotion.id}`} effect="O registro de promoção será removido da consulta ativa. Confira os dados antes de confirmar." execute={() => editor.runStatus(promotion.id, 'delete')} verify={() => editor.verifyDeleted(promotion.id)} disabled={state.busy || state.uncertain} onBusyChange={editor.setBusy} onUncertainChange={editor.setUncertain} />
      </div>
      <h4>Itens promocionais</h4>
      {detail.items.length === 0 ? <p>Nenhum item foi associado a esta promoção.</p> : <ul>{detail.items.map((item) => <li key={item.id}>
        {item.productName}: preço original {item.originalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}; promocional {item.promotionalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}; quantidade {item.quantityAvailable ?? 'não informada'}.
        {promotion.status === 'PENDING_APPROVAL' && <div className={styles.actions}><button type="button" disabled={disabled} onClick={() => editor.startEditItem(item)}>Editar item {item.productName}</button>
          <ConfirmedAction label={`Excluir item ${item.productName}`} effect="O item será removido desta promoção. A ação não altera o estoque." execute={() => editor.deleteItem(promotion.id, item.id)} verify={() => editor.verify(promotion.id)} disabled={state.busy || state.uncertain} onBusyChange={editor.setBusy} onUncertainChange={editor.setUncertain} />
        </div>}
      </li>)}</ul>}
      {promotion.status === 'PENDING_APPROVAL' && <form className={styles.card} aria-labelledby="promotion-item-form-title" onSubmit={(event) => { event.preventDefault(); editor.submitItem(); }}>
        <h4 id="promotion-item-form-title">{state.editingItemId === null ? 'Adicionar item à promoção' : `Editar item ${state.editingItemId}`}</h4><fieldset className={styles.fields} disabled={disabled}><legend>Produto e preços</legend><div className={styles.grid}>
          <div className={styles.field}><label htmlFor="promotion-item-product">Produto</label><select id="promotion-item-product" required disabled={state.editingItemId !== null} value={state.itemDraft.productId} onChange={(event) => editor.editItem('productId', event.target.value)}><option value="">Selecione</option>{query.data.products.filter((product) => product.active).map((product) => <option key={product.id} value={product.id}>{product.name} — {product.sku}</option>)}</select></div>
          <div className={styles.field}><label htmlFor="promotion-item-original">Preço original (R$)</label><input id="promotion-item-original" inputMode="decimal" required value={state.itemDraft.originalPrice} onChange={(event) => editor.editItem('originalPrice', event.target.value)} /></div>
          <div className={styles.field}><label htmlFor="promotion-item-discount">Preço promocional (R$)</label><input id="promotion-item-discount" inputMode="decimal" required value={state.itemDraft.promotionalPrice} onChange={(event) => editor.editItem('promotionalPrice', event.target.value)} /></div>
          <div className={styles.field}><label htmlFor="promotion-item-quantity">Quantidade disponível (opcional)</label><input id="promotion-item-quantity" inputMode="decimal" value={state.itemDraft.quantityAvailable} onChange={(event) => editor.editItem('quantityAvailable', event.target.value)} /></div>
        </div><div className={styles.actions}><button type="submit">Revisar item</button>{state.editingItemId !== null && <button type="button" onClick={editor.startAddItem}>Cancelar edição do item</button>}</div></fieldset>
      </form>}
    </section>}

    {state.reviewing && state.pending && <section className={styles.card} aria-labelledby="promotion-review-title"><h3 id="promotion-review-title" tabIndex={-1}>Revisar alteração da promoção</h3>
      {state.pending.kind === 'create' && <p>Criar “{state.pending.payload.name}” como inativa e pendente de aprovação?</p>}
      {state.pending.kind === 'update' && <p>Salvar dados atualizados da promoção {state.pending.id}?</p>}
      {(state.pending.kind === 'createItem' || state.pending.kind === 'updateItem') && <p>{state.pending.kind === 'createItem' ? 'Adicionar' : 'Atualizar'} produto {state.pending.kind === 'createItem' ? state.pending.payload.productId : state.itemDraft.productId} com preço promocional de {state.pending.payload.promotionalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}?</p>}
      <div className={styles.actions}>{!state.uncertain && <button type="button" disabled={state.busy} onClick={editor.confirm}>Confirmar alteração</button>}{state.uncertain && <button type="button" disabled={state.busy} onClick={() => void editor.verifyUnknownWrite()}>Consultar estado antes de nova escrita</button>}{!state.uncertain && <button type="button" disabled={state.busy} onClick={editor.cancelReview}>Voltar sem salvar</button>}</div>
    </section>}
  </section>;
}
