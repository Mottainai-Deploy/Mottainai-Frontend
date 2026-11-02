import { useCallback, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import ReusableTable from '@/components/ReusableTable';
import { useApiQuery } from '@/hooks/useApiQuery';
import { getProduct } from '@/services/productService';
import type { CatalogProduct } from '@/types/catalog-product.types';
import type { ReusableTableColumn } from '@/types/reusable-table.types';
import styles from './style.module.css';
import ProductOperations from '@/components/ProductOperations';

const columns: ReusableTableColumn<CatalogProduct>[] = [
  { id: 'sku', header: 'SKU', renderCell: (item) => item.sku },
  { id: 'category', header: 'Categoria', renderCell: (item) => item.categoryName },
  { id: 'brand', header: 'Marca', renderCell: (item) => item.brand || 'Não informada' },
  { id: 'ncm', header: 'NCM', renderCell: (item) => item.ncm },
  { id: 'cest', header: 'CEST', renderCell: (item) => item.cest || 'Não informado' },
  { id: 'unit', header: 'Unidade de medida', renderCell: (item) => item.unitMeasure },
  { id: 'weight', header: 'Peso', renderCell: (item) => item.weight === null ? 'Não informado' : item.weight.toLocaleString('pt-BR') },
  { id: 'active', header: 'Status', renderCell: (item) => item.active ? 'Ativo' : 'Inativo' },
];

export default function ProductDetails() {
  const navigate = useNavigate();
  const [state, setState] = useState({ revision: 0, message: '' });
  const { productId } = useParams<{ productId: string }>();
  const queryProduct = useCallback((signal: AbortSignal) => {
    if (!productId) return Promise.reject(new Error('O identificador do produto não foi informado.'));
    return getProduct(productId, signal);
  }, [productId]);
  const query = useApiQuery<CatalogProduct | null>(queryProduct, null, state.revision);
  return (
    <section className={styles.page} aria-labelledby="product-title">
      <Link className={styles.back} to="/products">Voltar para produtos</Link>
      <h1 id="product-title">{query.status === 'success' && query.data ? query.data.name : 'Detalhes do produto'}</h1>
      {state.message && <p role="status">{state.message}</p>}
      {query.status === 'loading' && <p className={styles.status} role="status">Carregando detalhes do produto…</p>}
      {query.status === 'error' && <p className={styles.feedback} role="alert">{query.error}</p>}
      {query.status === 'success' && query.data && <>
        <p role="status">Cadastro carregado.</p>
        <p>Código de barras: {query.data.barcode}</p>
        <ReusableTable title="Dados cadastrais do produto" columns={columns} data={[query.data]} rowKey={(item) => item.id} />
        <p>{query.data.description || 'Descrição não informada.'}</p>
        <ProductOperations key={`${query.data.id}-${state.revision}`} product={query.data} onChanged={message => setState(previous => ({ revision: previous.revision + 1, message }))}
          onDeleted={() => navigate('/products', { replace: true, state: { productDeleted: true } })} />
        <p>Consulte os saldos por lote na área de estoque.</p>
      </>}
    </section>
  );
}
