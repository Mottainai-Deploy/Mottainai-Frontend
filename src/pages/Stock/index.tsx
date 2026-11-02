import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import ReusableTable from '@/components/ReusableTable';
import { useApiQuery } from '@/hooks/useApiQuery';
import { getInventoryRows } from '@/services/inventoryService';
import { getInventoryCounts } from '@/services/inventoryCountService';
import type { InventoryRow } from '@/types/inventory-api.types';
import type { InventoryCount } from '@/types/inventory-count-api.types';
import type { ReusableTableColumn } from '@/types/reusable-table.types';
import { countStatusLabels, formatBatchDate, formatCountDate, inventoryTypeLabels } from '@/utils/inventoryPresentation';
import styles from './style.module.css';
import BatchStatus from '@/components/BatchStatus';
import PurchaseOperations from '@/components/PurchaseOperations';
import ReplenishmentOperations from '@/components/ReplenishmentOperations';

const inventoryColumns: ReusableTableColumn<InventoryRow>[] = [
  { id: 'product', header: 'Produto', renderCell: (item) => item.productId ? <Link to={`/products/${item.productId}`}>{item.productName}</Link> : item.productName },
  { id: 'barcode', header: 'Código de barras', renderCell: (item) => item.barcode },
  { id: 'store', header: 'Loja', renderCell: (item) => item.storeId },
  { id: 'batch', header: 'Lote', renderCell: (item) => item.batchCode },
  { id: 'expiration', header: 'Validade', renderCell: (item) => formatBatchDate(item.expirationDate) },
  { id: 'type', header: 'Tipo', renderCell: (item) => inventoryTypeLabels[item.inventoryType] },
  { id: 'location', header: 'Local', renderCell: (item) => item.location || 'Não informado' },
  { id: 'quantity', header: 'Saldo atual', renderCell: (item) => `${item.currentQuantity.toLocaleString('pt-BR')} ${item.unitMeasure}`, align: 'end' },
  { id: 'minimum', header: 'Mínimo', renderCell: (item) => item.minimumQuantity.toLocaleString('pt-BR'), align: 'end' },
  { id: 'maximum', header: 'Máximo', renderCell: (item) => item.maximumQuantity?.toLocaleString('pt-BR') ?? 'Não definido', align: 'end' },
];
const countColumns: ReusableTableColumn<InventoryCount>[] = [
  { id: 'id', header: 'Contagem', renderCell: (count) => count.id },
  { id: 'date', header: 'Início', renderCell: (count) => formatCountDate(count.startedAt) },
  { id: 'store', header: 'Loja', renderCell: (count) => count.storeId },
  { id: 'employee', header: 'Funcionário responsável', renderCell: (count) => count.employeeId },
  { id: 'status', header: 'Status', renderCell: (count) => countStatusLabels[count.status] },
  { id: 'open', header: 'Ação', renderCell: (count) => <Link className={styles.reportButton} to={`/stock/counts/new?id=${count.id}`}>Abrir contagem {count.id}</Link> },
];

export default function Stock() {
  const [params] = useSearchParams();
  const trackedOrderValue = params.get('purchaseOrderId') ?? '';
  const trackedOrderId = /^[1-9]\d*$/.test(trackedOrderValue) && Number.isSafeInteger(Number(trackedOrderValue)) ? Number(trackedOrderValue) : null;
  const trackedPreListValue = params.get('preListId') ?? '';
  const trackedPreListId = /^[1-9]\d*$/.test(trackedPreListValue) && Number.isSafeInteger(Number(trackedPreListValue)) ? Number(trackedPreListValue) : null;
  const [filters, setFilters] = useState({ search: '', type: '', revision: 0 });
  const inventory = useApiQuery(getInventoryRows, [], filters.revision);
  const counts = useApiQuery(getInventoryCounts, []);
  const search = filters.search.trim().toLocaleLowerCase('pt-BR');
  const filtered = inventory.data.filter((item) => (!filters.type || item.inventoryType === filters.type)
    && (!search || [item.productName, item.barcode, item.batchCode, item.location ?? ''].join(' ').toLocaleLowerCase('pt-BR').includes(search)));
  const sharedErrorMessage = inventory.status === 'error'
    && counts.status === 'error'
    && inventory.error === counts.error
    ? inventory.error
    : null;
  const queryErrors = sharedErrorMessage !== null
    ? [{ area: 'Estoque e contagens', message: sharedErrorMessage }]
    : [
      ...(inventory.status === 'error' ? [{ area: 'Estoque', message: inventory.error }] : []),
      ...(counts.status === 'error' ? [{ area: 'Contagens', message: counts.error }] : []),
    ];
  return (
    <section className={styles.page} aria-labelledby="stock-title">
      <h1 id="stock-title">Estoque e contagens</h1>
      <p>Estoque da loja vinculada à sua conta, separado por lote, tipo e local.</p>
      <div className={styles.toolbar}>
        <div className={styles.inventoryFilters}>
          <label htmlFor="inventory-search">Buscar produto, código, lote ou local
            <input id="inventory-search" value={filters.search} onChange={(event) => setFilters((previous) => ({ ...previous, search: event.target.value }))} />
          </label>
          <label htmlFor="inventory-type">Tipo de estoque
            <select id="inventory-type" value={filters.type} onChange={(event) => setFilters((previous) => ({ ...previous, type: event.target.value }))}>
              <option value="">Todos</option>
              {Object.entries(inventoryTypeLabels).map(([type, label]) => <option key={type} value={type}>{label}</option>)}
            </select>
          </label>
        </div>
        <Link className={styles.newCountButton} to="/stock/counts/new">Nova contagem</Link>
      </div>
      {inventory.status === 'loading' && <p role="status">Carregando estoque e lotes…</p>}
      {counts.status === 'loading' && <p role="status">Carregando contagens…</p>}
      {queryErrors.length > 0 && <ul className={styles.queryErrors} role="alert">
        {queryErrors.map(({ area, message }) => <li key={area}><strong>{area}:</strong> {message}</li>)}
      </ul>}
      {inventory.status === 'success' && <div className={styles.tableSection}>
        <p role="status">{filtered.length === 1 ? '1 item de estoque encontrado.' : `${filtered.length} itens de estoque encontrados.`}</p>
        <ReusableTable title="Estoque por lote" columns={inventoryColumns} data={filtered} rowKey={(item) => item.id} emptyMessage="Nenhum item de estoque corresponde aos filtros." />
      </div>}
      {counts.status === 'success' && <div className={styles.tableSection}>
        <p role="status">{counts.data.length === 1 ? '1 contagem encontrada.' : `${counts.data.length} contagens encontradas.`}</p>
        <ReusableTable title="Contagens da loja" columns={countColumns} data={counts.data} rowKey={(count) => count.id} emptyMessage="Nenhuma contagem registrada nesta loja." />
      </div>}
      <BatchStatus onChanged={() => setFilters(previous => ({ ...previous, revision: previous.revision + 1 }))} />
      <PurchaseOperations trackedOrderId={trackedOrderId} />
      <ReplenishmentOperations trackedPreListId={trackedPreListId} />
    </section>
  );
}
