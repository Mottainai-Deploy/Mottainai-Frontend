import ReusableTable from '@/components/ReusableTable';
import { useApiQuery } from '@/hooks/useApiQuery';
import { getInventoryRows } from '@/services/inventoryService';
import { getProducts } from '@/services/productService';
import type { CatalogProduct } from '@/types/catalog-product.types';
import type { InventoryRow } from '@/types/inventory-api.types';
import type { ReusableTableColumn } from '@/types/reusable-table.types';
import { formatBatchDate, inventoryTypeLabels } from '@/utils/inventoryPresentation';
import styles from './style.module.css';

const inventoryColumns: ReusableTableColumn<InventoryRow>[] = [
  { id: 'product', header: 'Produto', renderCell: (item) => item.productName },
  { id: 'batch', header: 'Lote', renderCell: (item) => item.batchCode },
  { id: 'expiration', header: 'Validade registrada', renderCell: (item) => formatBatchDate(item.expirationDate) },
  { id: 'quantity', header: 'Saldo atual', renderCell: (item) => `${item.currentQuantity.toLocaleString('pt-BR')} ${item.unitMeasure}`, align: 'end' },
  { id: 'type', header: 'Tipo de estoque', renderCell: (item) => inventoryTypeLabels[item.inventoryType] },
];

function Home() {
  const products = useApiQuery<CatalogProduct[]>(getProducts, []);
  const inventory = useApiQuery<InventoryRow[]>(getInventoryRows, []);

  return (
    <section className={styles.page} aria-labelledby="home-title">
      <h1 id="home-title">Visão geral do estoque</h1>
      <p className={styles.description}>Resumo e lotes carregados das integrações de catálogo e estoque.</p>

      {products.status === 'loading' && <p role="status">Carregando catálogo…</p>}
      {products.status === 'error' && <p className={styles.feedback} role="alert">{products.error}</p>}
      {inventory.status === 'loading' && <p role="status">Carregando estoque…</p>}
      {inventory.status === 'error' && <p className={styles.feedback} role="alert">{inventory.error}</p>}

      <dl className={styles.metrics} aria-label="Resumo dos dados disponíveis">
        {products.status === 'success' && (
          <div className={styles.metric}>
            <dt>Produtos ativos</dt>
            <dd>{products.data.filter((product) => product.active).length.toLocaleString('pt-BR')}</dd>
          </div>
        )}
        {inventory.status === 'success' && (
          <>
            <div className={styles.metric}>
              <dt>Lotes no estoque</dt>
              <dd>{inventory.data.length.toLocaleString('pt-BR')}</dd>
            </div>
            <div className={styles.metric}>
              <dt>Lotes com validade cadastrada</dt>
              <dd>{inventory.data.filter((item) => item.expirationDate !== null).length.toLocaleString('pt-BR')}</dd>
            </div>
          </>
        )}
      </dl>

      {inventory.status === 'success' && (
        <section className={styles.tableSection} aria-labelledby="inventory-title">
          <h2 id="inventory-title">Estoque da loja vinculada</h2>
          <ReusableTable
            title="Lotes do estoque"
            columns={inventoryColumns}
            data={inventory.data}
            rowKey={(item) => item.id}
            emptyMessage="A API não retornou lotes de estoque para esta loja."
          />
        </section>
      )}
    </section>
  );
}

export default Home;
