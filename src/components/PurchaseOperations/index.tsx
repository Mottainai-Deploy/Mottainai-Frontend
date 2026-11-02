import ConfirmedAction from '@/components/ConfirmedAction';
import { usePurchaseOperations } from '@/hooks/usePurchaseOperations';
import { formatCountDate } from '@/utils/inventoryPresentation';
import { purchaseOrderStatusLabels, receivingStatusLabels } from '@/utils/operationalPresentation';
import type { PurchaseOrderResponse } from '@/types/purchase-order-api.types';
import styles from '@/styles/operations.module.css';

export interface PurchaseOperationsProps {
  trackedOrderId: number | null;
}

function orderLabel(order: PurchaseOrderResponse): string {
  return `Pedido ${order.id} — ${purchaseOrderStatusLabels[order.status]}`;
}

export default function PurchaseOperations({ trackedOrderId }: PurchaseOperationsProps) {
  const editor = usePurchaseOperations(trackedOrderId);
  const { state, query, orderDetail, receivingDetail } = editor;
  const busy = state.busy || state.uncertain;
  const formDisabled = busy || query.status !== 'success';
  const order = orderDetail.data;

  return <section className={styles.page} aria-labelledby="purchase-operations-title">
    <h2 id="purchase-operations-title">Pedidos de compra e recebimentos</h2>
    <p>Pedidos registram a compra planejada. O estoque só recebe entrada quando um recebimento é confirmado.</p>

    {query.status === 'loading' && <p role="status">Carregando pedidos, recebimentos, produtos e fornecedores…</p>}
    {query.status === 'error' && <p role="alert">{query.error}</p>}
    {query.status === 'success' && <p role="status">Consulta concluída: {query.data.orders.length} pedido(s) e {query.data.receivings.length} recebimento(s) encontrados.</p>}
    {state.feedback && <p role={state.feedbackIsError ? 'alert' : 'status'}>{state.feedback}</p>}

    <form className={styles.card} aria-label="Consultar operações por período" onSubmit={(event) => { event.preventDefault(); editor.applyRange(); }}>
      <div className={styles.grid}>
        <div className={styles.field}><label htmlFor="purchases-from">Data inicial</label><input id="purchases-from" type="date" value={state.range.from} onChange={(event) => editor.changeRange('from', event.target.value)} /></div>
        <div className={styles.field}><label htmlFor="purchases-to">Data final</label><input id="purchases-to" type="date" value={state.range.to} onChange={(event) => editor.changeRange('to', event.target.value)} /></div>
      </div>
      <div className={styles.actions}><button type="submit" disabled={state.busy}>Aplicar período</button><button type="button" disabled={state.busy} onClick={editor.refresh}>Atualizar pedidos e recebimentos</button></div>
    </form>

    <label className={styles.field} htmlFor="purchase-operations-search">Buscar por identificador, fornecedor ou status
      <input id="purchase-operations-search" type="search" value={state.search} onChange={(event) => editor.setSearch(event.target.value)} />
    </label>

    {query.status === 'success' && <div className={styles.grid}>
      <section className={styles.card} aria-labelledby="purchase-orders-title">
        <h3 id="purchase-orders-title">Pedidos de compra</h3>
        <button type="button" disabled={formDisabled} onClick={editor.startCreateOrder}>Novo pedido</button>
        {editor.filteredOrders.length === 0 ? <p>Nenhum pedido encontrado no período.</p> : <ul>
          {editor.filteredOrders.map((item) => <li key={item.id}>
            <button type="button" disabled={state.busy} onClick={() => editor.selectOrder(item.id)}>{orderLabel(item)}</button>
            <span> Fornecedor {query.data.suppliers.find((supplier) => Number(supplier.id) === item.supplierId)?.tradeName ?? item.supplierId}; total {item.totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.</span>
          </li>)}
        </ul>}
      </section>
      <section className={styles.card} aria-labelledby="receivings-title">
        <h3 id="receivings-title">Recebimentos</h3>
        {editor.filteredReceivings.length === 0 ? <p>Nenhum recebimento encontrado no período.</p> : <ul>
          {editor.filteredReceivings.map((item) => <li key={item.id}>
            <button type="button" disabled={state.busy} onClick={() => editor.selectReceiving(item.id)}>Recebimento {item.id} — {receivingStatusLabels[item.status]}</button>
            <span> Pedido {item.purchaseOrderId}; {formatCountDate(item.receivingDate)}.</span>
          </li>)}
        </ul>}
      </section>
    </div>}

    {state.editingOrderId === null && state.reviewing === null && state.orderDraft.items.length > 0 && state.selectedOrderId === null && <form className={styles.card} aria-labelledby="purchase-order-form-title" onSubmit={(event) => { event.preventDefault(); editor.submitOrder(); }}>
      <h3 id="purchase-order-form-title">Cadastrar pedido de compra</h3>
      <p>A criação não dá entrada em estoque. Informe os produtos e os custos consultados.</p>
      <fieldset className={styles.fields} disabled={formDisabled}>
        <legend>Dados do pedido</legend>
        <div className={styles.grid}>
          <div className={styles.field}><label htmlFor="purchase-supplier">Fornecedor</label><select id="purchase-supplier" required value={state.orderDraft.supplierId} onChange={(event) => editor.editOrderDraft('supplierId', event.target.value)}><option value="">Selecione</option>{query.data.suppliers.filter((supplier) => supplier.active).map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.tradeName}</option>)}</select></div>
          <div className={styles.field}><label htmlFor="purchase-delivery-date">Entrega prevista (opcional)</label><input id="purchase-delivery-date" type="date" value={state.orderDraft.expectedDeliveryDate} onChange={(event) => editor.editOrderDraft('expectedDeliveryDate', event.target.value)} /></div>
          <div className={styles.field}><label htmlFor="purchase-observation">Observação (opcional)</label><textarea id="purchase-observation" maxLength={2000} value={state.orderDraft.observation} onChange={(event) => editor.editOrderDraft('observation', event.target.value)} /></div>
        </div>
        {state.orderDraft.items.map((item, index) => <fieldset className={styles.card} key={item.id}>
          <legend>Produto {index + 1}</legend>
          <div className={styles.grid}>
            <div className={styles.field}><label htmlFor={`purchase-product-${item.id}`}>Produto</label><select id={`purchase-product-${item.id}`} required value={item.productId} onChange={(event) => editor.editOrderItem(item.id, 'productId', event.target.value)}><option value="">Selecione</option>{query.data.products.filter((product) => product.active).map((product) => <option key={product.id} value={product.id}>{product.name} — {product.sku}</option>)}</select></div>
            <div className={styles.field}><label htmlFor={`purchase-quantity-${item.id}`}>Quantidade solicitada</label><input id={`purchase-quantity-${item.id}`} inputMode="decimal" required value={item.requestedQuantity} onChange={(event) => editor.editOrderItem(item.id, 'requestedQuantity', event.target.value)} /></div>
            <div className={styles.field}><label htmlFor={`purchase-cost-${item.id}`}>Custo unitário (R$)</label><input id={`purchase-cost-${item.id}`} inputMode="decimal" required value={item.unitCost} onChange={(event) => editor.editOrderItem(item.id, 'unitCost', event.target.value)} /></div>
          </div>
          <button type="button" disabled={formDisabled || state.orderDraft.items.length < 2} onClick={() => editor.removeOrderItem(item.id)}>Remover produto {index + 1}</button>
        </fieldset>)}
        <div className={styles.actions}><button type="button" onClick={editor.addOrderItem}>Adicionar produto</button><button type="submit">Revisar pedido</button></div>
      </fieldset>
    </form>}

    {state.editingOrderId !== null && state.reviewing === null && <form className={styles.card} aria-labelledby="purchase-order-edit-title" onSubmit={(event) => { event.preventDefault(); editor.submitOrder(); }}>
      <h3 id="purchase-order-edit-title">Editar pedido {state.editingOrderId}</h3>
      <p>A edição envia a versão consultada. Se ela estiver desatualizada, o servidor exige nova consulta.</p>
      <fieldset className={styles.fields} disabled={formDisabled || orderDetail.status !== 'success'}>
        <legend>Dados atualizados do pedido</legend>
        <div className={styles.grid}>
          <div className={styles.field}><label htmlFor="purchase-edit-supplier">Fornecedor</label><select id="purchase-edit-supplier" required value={state.orderDraft.supplierId} onChange={(event) => editor.editOrderDraft('supplierId', event.target.value)}><option value="">Selecione</option>{query.data.suppliers.filter((supplier) => supplier.active).map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.tradeName}</option>)}</select></div>
          <div className={styles.field}><label htmlFor="purchase-edit-delivery">Entrega prevista</label><input id="purchase-edit-delivery" type="date" value={state.orderDraft.expectedDeliveryDate} onChange={(event) => editor.editOrderDraft('expectedDeliveryDate', event.target.value)} /></div>
          <div className={styles.field}><label htmlFor="purchase-edit-observation">Observação</label><textarea id="purchase-edit-observation" maxLength={2000} value={state.orderDraft.observation} onChange={(event) => editor.editOrderDraft('observation', event.target.value)} /></div>
        </div>
        {state.orderDraft.items.map((item, index) => <fieldset className={styles.card} key={item.id}><legend>Produto {index + 1}</legend><div className={styles.grid}>
          <div className={styles.field}><label htmlFor={`purchase-edit-product-${item.id}`}>Produto</label><select id={`purchase-edit-product-${item.id}`} required value={item.productId} onChange={(event) => editor.editOrderItem(item.id, 'productId', event.target.value)}><option value="">Selecione</option>{query.data.products.filter((product) => product.active).map((product) => <option key={product.id} value={product.id}>{product.name} — {product.sku}</option>)}</select></div>
          <div className={styles.field}><label htmlFor={`purchase-edit-quantity-${item.id}`}>Quantidade solicitada</label><input id={`purchase-edit-quantity-${item.id}`} inputMode="decimal" required value={item.requestedQuantity} onChange={(event) => editor.editOrderItem(item.id, 'requestedQuantity', event.target.value)} /></div>
          <div className={styles.field}><label htmlFor={`purchase-edit-cost-${item.id}`}>Custo unitário (R$)</label><input id={`purchase-edit-cost-${item.id}`} inputMode="decimal" required value={item.unitCost} onChange={(event) => editor.editOrderItem(item.id, 'unitCost', event.target.value)} /></div>
        </div><button type="button" disabled={formDisabled || state.orderDraft.items.length < 2} onClick={() => editor.removeOrderItem(item.id)}>Remover produto {index + 1}</button></fieldset>)}
        <div className={styles.actions}><button type="button" onClick={editor.addOrderItem}>Adicionar produto</button><button type="submit" disabled={orderDetail.status !== 'success'}>Revisar alterações</button><button type="button" onClick={editor.cancelEdit}>Cancelar edição</button></div>
      </fieldset>
    </form>}

    {state.reviewing === 'order' && state.pendingOrderWrite && <section className={styles.card} aria-labelledby="purchase-order-review-title">
      <h3 id="purchase-order-review-title" tabIndex={-1}>Revisar pedido de compra</h3><p>A criação ou edição do pedido não movimenta o estoque.</p>
      <p>Fornecedor: {query.data.suppliers.find((supplier) => Number(supplier.id) === (state.pendingOrderWrite?.payload.supplierId ?? order?.supplierId))?.tradeName ?? state.pendingOrderWrite.payload.supplierId ?? order?.supplierId}.</p>
      {state.pendingOrderWrite.payload.items.map((item) => <p key={'productId' in item ? item.productId : ''}>{query.data.products.find((product) => product.id === item.productId)?.name ?? `Produto ${item.productId}`}: {item.requestedQuantity.toLocaleString('pt-BR')} a R$ {item.unitCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} por unidade.</p>)}
      {state.uncertain && <p>A resposta foi inconclusiva. {state.pendingOrderWrite.kind === 'create' ? 'A tentativa mantém os mesmos dados e a mesma chave.' : 'Consulte o pedido para conferir a versão atual antes de outra edição.'}</p>}
      <div className={styles.actions}>
        {!state.uncertain && <button type="button" disabled={state.busy} onClick={editor.confirmOrderWrite}>Confirmar pedido</button>}
        {state.uncertain && state.pendingOrderWrite.kind === 'create' && <button type="button" disabled={state.busy} onClick={editor.retryOrderWrite}>Reenviar a mesma solicitação</button>}
        {state.uncertain && state.pendingOrderWrite.kind === 'update' && <button type="button" disabled={state.busy} onClick={() => void editor.verifyOrderWrite()}>Consultar pedido no servidor</button>}
        {!state.uncertain && <button type="button" disabled={state.busy} onClick={editor.cancelReview}>Voltar sem confirmar</button>}
      </div>
    </section>}

    {orderDetail.status === 'loading' && <p role="status">Consultando pedido…</p>}
    {orderDetail.status === 'error' && <p role="alert">{orderDetail.error}</p>}
    {orderDetail.status === 'success' && order && <section className={styles.card} aria-labelledby="purchase-order-detail-title">
      <h3 id="purchase-order-detail-title">Detalhes do pedido {order.id}</h3><p>Status: {purchaseOrderStatusLabels[order.status]}. Versão: {order.version}. Total: {order.totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.</p>
      <p>Entrega prevista: {order.expectedDeliveryDate ? formatCountDate(order.expectedDeliveryDate) : 'não informada'}.</p>
      {order.items.map((item) => <p key={item.id}>{query.data.products.find((product) => product.id === item.productId)?.name ?? `Produto ${item.productId}`}: {item.requestedQuantity.toLocaleString('pt-BR')} unidades, custo {item.unitCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.</p>)}
      {order.status === 'PENDING' && <div className={styles.actions}>
        <button type="button" disabled={state.busy || state.uncertain} onClick={() => editor.startEdit(order)}>Editar</button>
        <ConfirmedAction label={`Aprovar pedido ${order.id}`} effect="A aprovação não registra entrada no estoque. O recebimento confirmado é uma etapa separada." execute={() => editor.changeOrderStatus(order.id, 'APPROVED')} verify={() => editor.verifyOrder(order.id)} disabled={state.busy || state.uncertain} onBusyChange={editor.setBusy} onUncertainChange={editor.setUncertain} />
        <ConfirmedAction label={`Cancelar pedido ${order.id}`} effect="O pedido deixará de estar pendente. Nenhuma entrada no estoque será registrada." execute={() => editor.changeOrderStatus(order.id, 'CANCELED')} verify={() => editor.verifyOrder(order.id)} disabled={state.busy || state.uncertain} onBusyChange={editor.setBusy} onUncertainChange={editor.setUncertain} />
        <ConfirmedAction label={`Excluir pedido ${order.id}`} effect="O registro do pedido será excluído pelo servidor. A operação não altera o estoque." execute={() => editor.deleteOrder(order.id)} verify={() => editor.verifyOrderDeletion(order.id)} disabled={state.busy || state.uncertain} onBusyChange={editor.setBusy} onUncertainChange={editor.setUncertain} />
      </div>}
      {order.status === 'APPROVED' && !state.receivingFormOpen && <button type="button" disabled={state.busy || state.uncertain} onClick={() => editor.beginReceiving(order)}>Registrar recebimento deste pedido</button>}
    </section>}

    {state.receivingFormOpen && state.selectedOrderId !== null && order?.status === 'APPROVED' && state.reviewing === null && <form className={styles.card} aria-labelledby="receiving-form-title" onSubmit={(event) => { event.preventDefault(); editor.submitReceiving(); }}>
      <h3 id="receiving-form-title">Registrar recebimento do pedido {order.id}</h3><p>O registro ainda não dá entrada no estoque. Confirme depois de revisar as quantidades recebidas.</p>
      <fieldset className={styles.fields} disabled={formDisabled || orderDetail.status !== 'success'}>
        <legend>Itens recebidos</legend><div className={styles.field}><label htmlFor="receiving-observation">Observação geral</label><textarea id="receiving-observation" maxLength={2000} value={state.receivingDraft.observation} onChange={(event) => editor.editReceivingDraft('observation', event.target.value)} /></div>
        {state.receivingDraft.items.map((item, index) => <fieldset className={styles.card} key={item.id}><legend>Item {index + 1}</legend><div className={styles.grid}>
          <div className={styles.field}><label htmlFor={`receiving-order-item-${item.id}`}>Item do pedido</label><select id={`receiving-order-item-${item.id}`} required value={item.purchaseOrderItemId} onChange={(event) => editor.editReceivingItem(item.id, 'purchaseOrderItemId', event.target.value)}><option value="">Selecione</option>{order.items.map((orderItem) => <option key={orderItem.id} value={orderItem.id}>{query.data.products.find((product) => product.id === orderItem.productId)?.name ?? `Produto ${orderItem.productId}`} — solicitado {orderItem.requestedQuantity}</option>)}</select></div>
          <div className={styles.field}><label htmlFor={`receiving-quantity-${item.id}`}>Quantidade recebida</label><input id={`receiving-quantity-${item.id}`} inputMode="decimal" required value={item.receivedQuantity} onChange={(event) => editor.editReceivingItem(item.id, 'receivedQuantity', event.target.value)} /></div>
          <div className={styles.field}><label htmlFor={`receiving-cost-${item.id}`}>Custo unitário (R$)</label><input id={`receiving-cost-${item.id}`} inputMode="decimal" required value={item.unitCost} onChange={(event) => editor.editReceivingItem(item.id, 'unitCost', event.target.value)} /></div>
          <div className={styles.field}><label htmlFor={`receiving-manufacture-${item.id}`}>Data de fabricação (opcional)</label><input id={`receiving-manufacture-${item.id}`} type="date" value={item.manufactureDate} onChange={(event) => editor.editReceivingItem(item.id, 'manufactureDate', event.target.value)} /></div>
          <div className={styles.field}><label htmlFor={`receiving-expiration-${item.id}`}>Validade</label><input id={`receiving-expiration-${item.id}`} type="date" required value={item.expirationDate} onChange={(event) => editor.editReceivingItem(item.id, 'expirationDate', event.target.value)} /></div>
          <div className={styles.field}><label htmlFor={`receiving-item-note-${item.id}`}>Observação do item</label><input id={`receiving-item-note-${item.id}`} value={item.observation} onChange={(event) => editor.editReceivingItem(item.id, 'observation', event.target.value)} /></div>
        </div><button type="button" disabled={formDisabled || state.receivingDraft.items.length < 2} onClick={() => editor.removeReceivingItem(item.id)}>Remover item {index + 1}</button></fieldset>)}
        <div className={styles.actions}><button type="button" onClick={editor.addReceivingItem}>Adicionar item recebido</button><button type="submit">Revisar recebimento</button><button type="button" onClick={editor.cancelReceiving}>Cancelar recebimento</button></div>
      </fieldset>
    </form>}

    {state.reviewing === 'receiving' && state.pendingReceivingWrite && <section className={styles.card} aria-labelledby="receiving-review-title"><h3 id="receiving-review-title" tabIndex={-1}>Revisar recebimento</h3>
      <p>Pedido {state.pendingReceivingWrite.payload.purchaseOrderId}; {state.pendingReceivingWrite.payload.items.length} item(ns). O registro não reduz nem aumenta o saldo até a confirmação do recebimento.</p>
      {state.pendingReceivingWrite.payload.items.map((item) => <p key={item.purchaseOrderItemId}>Item do pedido {item.purchaseOrderItemId}: {item.receivedQuantity.toLocaleString('pt-BR')} unidades; validade {item.expirationDate}.</p>)}
      {state.uncertain && <p>Os dados e a chave original estão preservados. Reenviar recupera o registro já criado ou repete esta mesma solicitação.</p>}
      <div className={styles.actions}>{!state.uncertain && <button type="button" disabled={state.busy} onClick={editor.confirmReceivingWrite}>Registrar recebimento</button>}{state.uncertain && <button type="button" disabled={state.busy} onClick={editor.retryReceivingWrite}>Reenviar a mesma solicitação</button>}{!state.uncertain && <button type="button" disabled={state.busy} onClick={editor.cancelReview}>Voltar sem registrar</button>}</div>
    </section>}

    {receivingDetail.status === 'loading' && <p role="status">Consultando recebimento…</p>}
    {receivingDetail.status === 'error' && <p role="alert">{receivingDetail.error}</p>}
    {receivingDetail.status === 'success' && receivingDetail.data && <section className={styles.card} aria-labelledby="receiving-detail-title"><h3 id="receiving-detail-title">Recebimento {receivingDetail.data.id}</h3>
      <p>Status: {receivingStatusLabels[receivingDetail.data.status]}. Pedido: {receivingDetail.data.purchaseOrderId}. Data: {formatCountDate(receivingDetail.data.receivingDate)}.</p>
      {receivingDetail.data.items.map((item) => <p key={item.id}>Produto {query.data.products.find((product) => product.id === item.productId)?.name ?? item.productId}: solicitado {item.requestedQuantity}, recebido {item.receivedQuantity}, validade {formatCountDate(item.expirationDate)}.</p>)}
      {receivingDetail.data.status === 'PENDING' && <div className={styles.actions}>
        {receivingDetail.data.items.every((item) => item.receivedQuantity === item.requestedQuantity) && <ConfirmedAction label={`Confirmar recebimento ${receivingDetail.data.id}`} effect="A confirmação registra a entrada de estoque conforme as regras do servidor." execute={() => editor.changeReceivingStatus(receivingDetail.data!.id, 'CONFIRMED')} verify={() => editor.verifyReceiving(receivingDetail.data!.id)} disabled={state.busy || state.uncertain} onBusyChange={editor.setBusy} onUncertainChange={editor.setUncertain} />}
        <ConfirmedAction label={`Indicar divergência no recebimento ${receivingDetail.data.id}`} effect="O recebimento ficará marcado como divergente e não deve ser tratado como entrada confirmada." execute={() => editor.changeReceivingStatus(receivingDetail.data!.id, 'DIVERGENT')} verify={() => editor.verifyReceiving(receivingDetail.data!.id)} disabled={state.busy || state.uncertain} onBusyChange={editor.setBusy} onUncertainChange={editor.setUncertain} />
      </div>}
    </section>}
  </section>;
}
