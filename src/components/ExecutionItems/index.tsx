import type { ExecutionItemsProps } from '@/types/suggested-execution.types';
import { usesExecutionBatches } from '@/utils/suggestedExecutionValidation';
import { alertPriorityLabels } from '@/utils/alertPresentation';
import styles from '@/styles/operations.module.css';

export default function ExecutionItems({ type, draft, context, onChange, onAdd, onRemove }: ExecutionItemsProps) {
  const batches = usesExecutionBatches(type);
  const inventory = context.inventory.filter((row) => row.storeId === context.profile.storeId && row.inventoryType === 'NORMAL' && row.currentQuantity > 0);
  return <div className={styles.fields}>
    <h3>Itens da operação</h3>
    {batches && <p>Selecione lotes do estoque normal. A quantidade não pode superar o saldo consultado; o servidor confere o saldo novamente.</p>}
    {draft.items.map((item, index) => {
      const prefix = `execution-item-${item.id}`;
      return <fieldset key={item.id} className={styles.card}>
        <legend>Item {index + 1}</legend>
        <div className={styles.grid}>
          <div className={styles.field}><label htmlFor={`${prefix}-reference`}>{batches ? 'Produto / lote' : 'Produto'} do item {index + 1}</label>
            <select id={`${prefix}-reference`} required value={item.referenceId} onChange={(event) => onChange(item.id, 'referenceId', event.target.value)}><option value="">Selecione</option>
              {batches ? inventory.map((row) => <option key={row.id} value={row.id}>{row.productName} — {row.batchCode} — saldo {row.currentQuantity.toLocaleString('pt-BR')} {row.unitMeasure}</option>)
                : context.products.filter((product) => product.active).map((product) => <option key={product.id} value={product.id}>{product.name} — {product.sku} — {product.unitMeasure}</option>)}
            </select>
          </div>
          {type !== 'CREATE_PROMOTION' && <div className={styles.field}><label htmlFor={`${prefix}-quantity`}>Quantidade do item {index + 1}</label><input id={`${prefix}-quantity`} inputMode="decimal" required value={item.quantity} onChange={(event) => onChange(item.id, 'quantity', event.target.value)} /></div>}
          {type === 'CREATE_PURCHASE_ORDER' && <div className={styles.field}><label htmlFor={`${prefix}-cost`}>Custo unitário do item {index + 1} (R$)</label><input id={`${prefix}-cost`} inputMode="decimal" required value={item.unitCost} onChange={(event) => onChange(item.id, 'unitCost', event.target.value)} /></div>}
          {type === 'CREATE_PROMOTION' && <>
            <div className={styles.field}><label htmlFor={`${prefix}-original`}>Preço original do item {index + 1} (R$)</label><input id={`${prefix}-original`} inputMode="decimal" required value={item.originalPrice} onChange={(event) => onChange(item.id, 'originalPrice', event.target.value)} /></div>
            <div className={styles.field}><label htmlFor={`${prefix}-price`}>Preço promocional do item {index + 1} (R$)</label><input id={`${prefix}-price`} inputMode="decimal" required value={item.promotionalPrice} onChange={(event) => onChange(item.id, 'promotionalPrice', event.target.value)} /></div>
            <div className={styles.field}><label htmlFor={`${prefix}-available`}>Quantidade disponível do item {index + 1} (opcional)</label><input id={`${prefix}-available`} inputMode="decimal" value={item.quantityAvailable} onChange={(event) => onChange(item.id, 'quantityAvailable', event.target.value)} /></div>
          </>}
          {type === 'CREATE_REPLENISHMENT' && <div className={styles.field}><label htmlFor={`${prefix}-priority`}>Prioridade do item {index + 1}</label><select id={`${prefix}-priority`} required value={item.priority} onChange={(event) => onChange(item.id, 'priority', event.target.value)}><option value="">Selecione</option>{Object.entries(alertPriorityLabels).map(([priority, label]) => <option key={priority} value={priority}>{label}</option>)}</select></div>}
        </div><button type="button" disabled={draft.items.length <= 1} onClick={() => onRemove(item.id)}>Remover item {index + 1}</button>
      </fieldset>;
    })}
    <button type="button" onClick={onAdd}>Adicionar item</button>
  </div>;
}
