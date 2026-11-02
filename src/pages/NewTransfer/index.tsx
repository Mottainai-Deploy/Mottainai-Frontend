import { Link } from 'react-router-dom';
import DropdownSelect from '@/components/DropdownSelect';
import { useNewTransfer } from '@/hooks/useNewTransfer';
import { transferStatusLabels } from '@/utils/transferApiValidation';
import styles from '@/styles/operations.module.css';

export default function NewTransfer() {
  const editor = useNewTransfer();
  const { state } = editor;
  const context = editor.context.data;
  const inventoryMap = new Map(editor.inventory.data.map((item) => [String(item.id), item]));
  const destination = context?.stores.find((store) => String(store.id) === state.form.destinationStoreId);
  const locked = editor.blocked || state.reviewing;
  return <section className={styles.page} aria-labelledby="new-transfer-title">
    <h1 id="new-transfer-title">Nova transferência</h1>
    <Link className={styles.link} to="/stock/transfers">Voltar ao histórico</Link>
    {state.message && <p id="transfer-create-feedback" tabIndex={-1} className={styles.feedback} role={state.failed ? 'alert' : 'status'}>{state.message}</p>}
    {(editor.context.status === 'loading' || editor.inventory.status === 'loading') && <p role="status">Carregando loja e estoque disponíveis…</p>}
    {editor.context.status === 'error' && <p role="alert">{editor.context.error}</p>}
    {editor.inventory.status === 'error' && <p role="alert">{editor.inventory.error}</p>}
    {!state.created && <form className={styles.card} onSubmit={editor.review} noValidate>
      <p>A solicitação não retira estoque. A retirada ocorre ao enviar a transferência.</p>
      {context && <p>Origem: loja {context.profile.storeId}. Solicitante: {context.profile.name}.</p>}
      <fieldset className={styles.fields} disabled={locked || !editor.ready}>
        <legend>Destino e lotes</legend>
        <label className={styles.field} htmlFor="transfer-destination">Loja de destino *
          {context?.storeListAvailable ? <DropdownSelect id="transfer-destination" value={state.form.destinationStoreId} required
            ariaInvalid={Boolean(state.errors.destinationStoreId)} ariaDescribedBy={state.errors.destinationStoreId ? 'transfer-destination-error' : undefined}
            onChange={(event) => editor.change('destinationStoreId', event.target.value)}>
            <option value="">Selecione uma loja</option>
            {editor.destinations.map((store) => <option key={store.id} value={store.id}>{store.name} — {store.id}</option>)}
          </DropdownSelect> : <input id="transfer-destination" inputMode="numeric" value={state.form.destinationStoreId} required
            aria-invalid={Boolean(state.errors.destinationStoreId)} aria-describedby={state.errors.destinationStoreId ? 'transfer-destination-error' : 'transfer-destination-hint'}
            onChange={(event) => editor.change('destinationStoreId', event.target.value)} />}
        </label>
        {context && !context.storeListAvailable && <p id="transfer-destination-hint">A listagem de lojas não está disponível para sua conta. Informe o identificador fornecido pela loja de destino; o servidor validará o acesso.</p>}
        {state.errors.destinationStoreId && <span id="transfer-destination-error">{state.errors.destinationStoreId}</span>}
        {context?.storeListAvailable && editor.destinations.length === 0 && <p role="status">Não há outras lojas ativas disponíveis.</p>}
        <fieldset id="transfer-items" className={styles.fields} tabIndex={-1} aria-describedby={state.errors.items ? 'transfer-items-error' : undefined}>
          <legend>Lotes e quantidades *</legend>
          {state.form.items.map((item, index) => <div key={item.id} className={styles.card}>
            <div className={styles.grid}>
              <label className={styles.field} htmlFor={`transfer-batch-${item.id}`}>Produto / lote {index + 1}
                <DropdownSelect id={`transfer-batch-${item.id}`} value={item.inventoryId} required
                  ariaInvalid={Boolean(state.errors.items)} ariaDescribedBy={state.errors.items ? 'transfer-items-error' : undefined}
                  onChange={(event) => editor.changeItem(item.id, 'inventoryId', event.target.value)}>
                  <option value="">Selecione um lote do estoque normal</option>
                  {editor.available.map((row) => <option key={row.id} value={row.id}>{row.productName} — {row.batchCode} — saldo {row.currentQuantity.toLocaleString('pt-BR')} {row.unitMeasure}</option>)}
                </DropdownSelect>
              </label>
              <label className={styles.field} htmlFor={`transfer-quantity-${item.id}`}>Quantidade do lote {index + 1}
                <input id={`transfer-quantity-${item.id}`} inputMode="decimal" required value={item.quantity}
                  aria-invalid={Boolean(state.errors.items)} aria-describedby={state.errors.items ? 'transfer-items-error' : undefined}
                  onChange={(event) => editor.changeItem(item.id, 'quantity', event.target.value)} />
              </label>
            </div>
            <button type="button" onClick={() => {
              editor.removeItem(item.id);
              window.requestAnimationFrame(() => document.getElementById('transfer-add-item')?.focus());
            }}>Remover lote {index + 1}</button>
          </div>)}
          {state.errors.items && <span id="transfer-items-error">{state.errors.items}</span>}
          <button id="transfer-add-item" type="button" onClick={() => {
            editor.addItem();
            window.requestAnimationFrame(() => {
              const selects = document.querySelectorAll<HTMLSelectElement>('[id^="transfer-batch-"]');
              selects[selects.length - 1]?.focus();
            });
          }}>Adicionar lote</button>
        </fieldset>
        <label className={styles.field} htmlFor="transfer-observation">Observação
          <textarea id="transfer-observation" rows={3} maxLength={500} value={state.form.observation}
            aria-invalid={Boolean(state.errors.observation)} aria-describedby={state.errors.observation ? 'transfer-observation-error' : undefined}
            onChange={(event) => editor.change('observation', event.target.value)} />
        </label>
        {state.errors.observation && <span id="transfer-observation-error">{state.errors.observation}</span>}
      </fieldset>
      <button id="transfer-create-review-button" type="submit" disabled={locked || !editor.ready || editor.available.length === 0}>Revisar solicitação</button>
      {editor.inventory.status === 'success' && editor.available.length === 0 && <p role="status">Não há lotes com saldo no estoque normal da origem.</p>}
    </form>}
    {state.reviewing && !state.pending && <section className={styles.card} aria-labelledby="transfer-create-review">
      <h2 id="transfer-create-review" tabIndex={-1}>Revisar solicitação de transferência</h2>
      <p>Origem: loja {context?.profile.storeId}. Destino: {destination?.name || `loja ${state.form.destinationStoreId}`}.</p>
      <ul>{state.form.items.map((item) => { const row = inventoryMap.get(item.inventoryId); return <li key={item.id}>{row ? `${row.productName} — ${row.batchCode}` : `Item de estoque ${item.inventoryId}`}: {item.quantity} {row?.unitMeasure}</li>; })}</ul>
      <p>Observação: {state.form.observation || 'Não informada'}.</p>
      <p>O saldo só será retirado na etapa de envio.</p>
      <div className={styles.actions}>
        <button type="button" disabled={editor.blocked || !editor.ready} onClick={editor.confirm}>Confirmar solicitação</button>
        <button id="transfer-create-cancel-review" type="button" disabled={editor.blocked} onClick={editor.cancelReview}>Voltar à edição</button>
      </div>
    </section>}
    {state.pending && !state.busy && <section className={styles.card}>
      <h2>Solicitação ainda não confirmada</h2>
      <p>Destino: loja {state.pending.payload.destinationStoreId}. {state.pending.payload.items.length} lotes.</p>
      <p>Reenviar mantém os mesmos dados e chave. Mantenha a página aberta até confirmar o resultado; ao sair ou recarregar, consulte o histórico antes de solicitar novamente.</p>
      <button type="button" onClick={editor.retry}>Reenviar a mesma solicitação</button>
    </section>}
    {state.created && <section className={styles.card}>
      <h2>Transferência {state.created.id}</h2>
      <p role="status">Status confirmado: {transferStatusLabels[state.created.status]}.</p>
      <p>Origem: loja {state.created.sourceStoreId}. Destino: loja {state.created.destinationStoreId}.</p>
      <Link className={styles.link} to={`/stock/transfers?id=${state.created.id}`}>Abrir transferência para acompanhar e enviar</Link>
      <button type="button" onClick={() => {
        editor.reset();
        window.requestAnimationFrame(() => document.getElementById('transfer-destination')?.focus());
      }}>Iniciar outra solicitação</button>
    </section>}
  </section>;
}
