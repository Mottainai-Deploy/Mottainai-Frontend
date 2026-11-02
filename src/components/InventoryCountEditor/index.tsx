import { Link } from 'react-router-dom';
import DropdownSelect from '@/components/DropdownSelect';
import ReusableTable from '@/components/ReusableTable';
import { useInventoryCountEditor } from '@/hooks/useInventoryCountEditor';
import type { InventoryCountEditorProps, InventoryCountItem } from '@/types/inventory-count-api.types';
import type { ReusableTableColumn } from '@/types/reusable-table.types';
import { countStatusLabels, formatCountDate, inventoryTypeLabels } from '@/utils/inventoryPresentation';
import styles from './style.module.css';

export default function InventoryCountEditor(props: InventoryCountEditorProps) {
  const editor = useInventoryCountEditor(props);
  const { state, count } = editor;
  const inventoryMap = new Map(editor.inventory.data.map((item) => [item.id, item]));
  const columns: ReusableTableColumn<InventoryCountItem>[] = [
    { id: 'inventory', header: 'Produto / lote', renderCell: (item) => {
      const inventory = inventoryMap.get(item.inventoryId);
      return inventory ? `${inventory.productName} — ${inventory.batchCode} — ${inventory.location || 'Local não informado'}` : `Item de estoque ${item.inventoryId}`;
    } },
    { id: 'system', header: 'Saldo registrado na inclusão', renderCell: (item) => item.systemQuantity.toLocaleString('pt-BR') },
    { id: 'counted', header: 'Quantidade física', renderCell: (item) => item.countedQuantity.toLocaleString('pt-BR') },
    { id: 'difference', header: 'Diferença', renderCell: (item) => item.difference.toLocaleString('pt-BR') },
    { id: 'observation', header: 'Observação', renderCell: (item) => item.observation || 'Não informada' },
    { id: 'edit', header: 'Ação', renderCell: (item) => <button type="button" aria-label={`Editar quantidade do item ${item.inventoryId}`} disabled={!editor.editable || state.reviewing || editor.inventory.status !== 'success'} onClick={() => {
      editor.edit(item);
      document.getElementById('count-item-quantity')?.focus();
    }}>Editar quantidade</button> },
    { id: 'remove', header: 'Remover', renderCell: (item) => <button type="button" id={`remove-count-item-${item.id}`}
      disabled={!editor.editable || state.reviewing || Boolean(state.item.inventoryId || state.item.quantity || state.item.observation)}
      aria-label={`Remover item ${item.inventoryId} da contagem`} onClick={() => {
        editor.askRemove(item);
        window.requestAnimationFrame(() => document.getElementById('count-remove-title')?.focus());
      }}>Remover item</button> },
  ];
  const pendingItem = Boolean(state.item.inventoryId || state.item.quantity || state.item.observation);
  return (
    <section className={styles.page} aria-labelledby="count-title">
      <Link className={styles.back} to="/stock">Voltar para estoque e contagens</Link>
      <h1 id="count-title">{props.countId ? `Contagem ${props.countId}` : 'Nova contagem de estoque'}</h1>
      {state.message && <p id="count-feedback" tabIndex={-1} className={state.failed ? styles.error : styles.feedback} role={state.failed ? 'alert' : 'status'}>{state.message}</p>}
      {!props.countId && <form className={styles.card} onSubmit={editor.create}>
        <p>A contagem será criada na loja vinculada à sua conta. Nenhum saldo é alterado nesta etapa.</p>
        <label htmlFor="count-observation">Observação da contagem (opcional)</label>
        <textarea id="count-observation" maxLength={2000} value={state.observation} disabled={state.busy} onChange={(event) => editor.changeObservation(event.target.value)} />
        <button type="submit" disabled={state.busy}>Criar contagem</button>
      </form>}
      {props.countId && !count && editor.query.status === 'loading' && <p role="status">Carregando contagem…</p>}
      {props.countId && !count && editor.query.status === 'error' && <p role="alert">{editor.query.error}</p>}
      {props.countId && <button type="button" disabled={state.busy} onClick={editor.reload}>Consultar estado da contagem</button>}
      {count && <>
        <div className={styles.card}>
          <p role="status">Status: {countStatusLabels[count.status]}. {count.items.length} {count.items.length === 1 ? 'item registrado' : 'itens registrados'}.</p>
          <p>Loja {count.storeId} · Funcionário responsável {count.employeeId} · Início: {formatCountDate(count.startedAt)}</p>
          {count.finishedAt && <p>Fim: {formatCountDate(count.finishedAt)}</p>}
          <p>{count.observation || 'Sem observação geral.'}</p>
        </div>
        {editor.inventory.status === 'loading' && <p role="status">Carregando estoque e lotes…</p>}
        {editor.inventory.status === 'error' && <p role="alert">{editor.inventory.error}</p>}
        <div className={styles.itemTable}>
          <ReusableTable title="Itens da contagem" columns={columns} data={count.items} rowKey={(item) => item.id} emptyMessage="Nenhum item foi registrado nesta contagem." />
        </div>
        {state.removal && !state.uncertainRemoval && <section className={styles.card} aria-labelledby="count-remove-title">
          <h2 id="count-remove-title" tabIndex={-1}>Revisar remoção do item {state.removal.inventoryId}</h2>
          <p>A quantidade física deste item será retirada da contagem. O saldo do estoque não será alterado.</p>
          <div className={styles.actions}>
            <button type="button" disabled={state.busy} onClick={async () => {
              await editor.remove();
              window.requestAnimationFrame(() => document.getElementById('count-feedback')?.focus());
            }}>Confirmar remoção do item</button>
            <button type="button" disabled={state.busy} onClick={() => {
              const id = state.removal?.id;
              editor.askRemove(null);
              window.requestAnimationFrame(() => document.getElementById(`remove-count-item-${id}`)?.focus());
            }}>Manter item na contagem</button>
          </div>
        </section>}
        {state.uncertainRemoval && <p role="alert">A remoção ainda não foi confirmada. Consulte o estado da contagem antes de continuar.</p>}
        {count.status === 'IN_PROGRESS' && !state.reviewing && <form className={styles.card} onSubmit={editor.save} noValidate>
          <h2>Registrar quantidade física</h2>
          <p>Selecione o produto e lote. Para um item já contado, salvar substitui a quantidade física anterior.</p>
          <fieldset className={styles.fields} disabled={!editor.editable || editor.inventory.status !== 'success'}>
            <legend>Item e quantidade</legend>
            <label htmlFor="count-item-inventoryId">Produto / lote / local *</label>
            <DropdownSelect id="count-item-inventoryId" value={state.item.inventoryId} required
              ariaInvalid={Boolean(state.errors.inventoryId)} ariaDescribedBy={state.errors.inventoryId ? 'count-inventory-error' : undefined}
              onChange={(event) => editor.change('inventoryId', event.target.value)}>
              <option value="">Selecione um item de estoque</option>
              {editor.availableInventory.map((item) => <option key={item.id} value={item.id}>{item.productName} — {item.batchCode} — {item.location || 'Local não informado'} — {inventoryTypeLabels[item.inventoryType]} — {item.unitMeasure || 'Unidade não informada'}</option>)}
            </DropdownSelect>
            {state.errors.inventoryId && <span className={styles.error} id="count-inventory-error">{state.errors.inventoryId}</span>}
            <label htmlFor="count-item-quantity">Quantidade física *</label>
            <input id="count-item-quantity" inputMode="decimal" required value={state.item.quantity}
              aria-invalid={Boolean(state.errors.quantity)} aria-describedby={state.errors.quantity ? 'count-quantity-error' : undefined}
              onChange={(event) => editor.change('quantity', event.target.value)} />
            {state.errors.quantity && <span className={styles.error} id="count-quantity-error">{state.errors.quantity}</span>}
            <label htmlFor="count-item-observation">Observação do item</label>
            <textarea id="count-item-observation" maxLength={2000} value={state.item.observation}
              aria-invalid={Boolean(state.errors.observation)} aria-describedby={state.errors.observation ? 'count-observation-error' : undefined}
              onChange={(event) => editor.change('observation', event.target.value)} />
            {state.errors.observation && <span className={styles.error} id="count-observation-error">{state.errors.observation}</span>}
            <div className={styles.actions}>
              <button type="submit" disabled={editor.availableInventory.length === 0}>Salvar quantidade</button>
              <button type="button" onClick={editor.clearItem}>Limpar formulário</button>
            </div>
          </fieldset>
          {editor.inventory.status === 'success' && editor.availableInventory.length === 0 && <p role="status">Não há itens de estoque disponíveis nesta loja.</p>}
        </form>}
        {state.uncertainFinish && <p role="alert">A finalização ainda não foi confirmada. Consulte o estado da contagem antes de continuar.</p>}
        {state.reviewing && !state.uncertainFinish && <section className={styles.card} aria-labelledby="finish-review-title">
          <h2 id="finish-review-title" tabIndex={-1}>Revisar finalização</h2>
          <p>Confira as quantidades e diferenças na tabela. Confirmar aplica os ajustes de estoque e encerra esta contagem.</p>
          <div className={styles.actions}>
            <button type="button" disabled={state.busy} onClick={async () => {
              await editor.finish();
              window.requestAnimationFrame(() => document.getElementById('count-feedback')?.focus());
            }}>Confirmar finalização e ajustar estoque</button>
            <button id="cancel-count-review" type="button" disabled={state.busy} onClick={() => {
              editor.review(false);
              window.requestAnimationFrame(() => document.getElementById('review-count')?.focus());
            }}>Voltar à edição</button>
          </div>
        </section>}
        {count.status === 'IN_PROGRESS' && !state.reviewing && <>
          {pendingItem && <p>Salve a quantidade ou limpe o formulário antes de revisar a finalização.</p>}
          <button id="review-count" type="button" disabled={!editor.editable || count.items.length === 0 || pendingItem} onClick={() => {
            editor.review(true);
            window.requestAnimationFrame(() => document.getElementById('finish-review-title')?.focus());
          }}>Revisar finalização</button>
        </>}
      </>}
    </section>
  );
}
