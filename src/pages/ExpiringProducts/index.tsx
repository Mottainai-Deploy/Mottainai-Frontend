import { useMemo, useState } from 'react';
import ReusableTable from '@/components/ReusableTable';
import { useApiQuery } from '@/hooks/useApiQuery';
import { getInventoryRows } from '@/services/inventoryService';
import type { InventoryRow } from '@/types/inventory-api.types';
import type { ReusableTableColumn } from '@/types/reusable-table.types';
import { formatBatchDate, inventoryTypeLabels } from '@/utils/inventoryPresentation';
import styles from './style.module.css';

const columns: ReusableTableColumn<InventoryRow>[] = [
  { id: 'product', header: 'Produto', renderCell: (item) => item.productName },
  { id: 'barcode', header: 'Código de barras', renderCell: (item) => item.barcode },
  { id: 'batch', header: 'Lote', renderCell: (item) => item.batchCode },
  { id: 'expiration', header: 'Validade registrada', renderCell: (item) => formatBatchDate(item.expirationDate) },
  { id: 'quantity', header: 'Saldo atual', renderCell: (item) => `${item.currentQuantity.toLocaleString('pt-BR')} ${item.unitMeasure}`, align: 'end' },
  { id: 'type', header: 'Tipo', renderCell: (item) => inventoryTypeLabels[item.inventoryType] },
];

function ExpiringProducts() {
  const inventory = useApiQuery<InventoryRow[]>(getInventoryRows, []);
  const [search, setSearch] = useState('');
  const expiringLots = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR');
    return inventory.data
      .filter((item) => item.expirationDate !== null)
      .filter((item) => !normalizedSearch || [item.productName, item.barcode, item.batchCode, item.expirationDate ?? '']
        .join(' ').toLocaleLowerCase('pt-BR').includes(normalizedSearch))
      .sort((first, second) => (first.expirationDate ?? '').localeCompare(second.expirationDate ?? ''));
  }, [inventory.data, search]);

  return (
    <section className={styles.page} aria-labelledby="expiring-title">
      <h1 id="expiring-title">Validades registradas nos lotes</h1>
      <p>Esta lista mostra as datas de validade retornadas pela API. A tela não classifica urgência nem sugere ações sem regras fornecidas pelo sistema.</p>

      <label className={styles.filter} htmlFor="expiration-search">
        Buscar produto, código, lote ou data
        <input id="expiration-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} />
      </label>

      {inventory.status === 'loading' && <p role="status">Carregando lotes…</p>}
      {inventory.status === 'error' && <p role="alert">{inventory.error}</p>}
      {inventory.status === 'success' && (
        <>
          <p role="status">{expiringLots.length === 1 ? '1 lote com validade informada.' : `${expiringLots.length} lotes com validade informada.`}</p>
          <ReusableTable
            title="Lotes com validade cadastrada"
            columns={columns}
            data={expiringLots}
            rowKey={(item) => item.id}
            emptyMessage="A API não retornou lotes com validade cadastrada para esta loja e busca."
          />
        </>
      )}
    </section>
  );
}

export default ExpiringProducts;
