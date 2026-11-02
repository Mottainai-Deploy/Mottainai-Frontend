import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import DetailsModal from "@/components/DetailsModal";
import ProductsFilters from "@/components/ProductsFilters";
import { getProducts } from '@/services/productService';
import { useApiQuery } from '@/hooks/useApiQuery';
import type { CatalogProduct } from '@/types/catalog-product.types';
import type { DetailsModalField, OpenDetailsDialog } from "@/types/details-modal.types";
import type {
  ProductFilterState,
} from "@/types/product.types";
import styles from "./style.module.css";
import PromotionOperations from '@/components/PromotionOperations';


const initialFilters: ProductFilterState = { search: "", category: "" };
// Keyboard focus lets users scroll the product table horizontally without a pointer.
const keyboardScrollProps = { tabIndex: 0 } as const;


const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();

function Products() {
  const location = useLocation();
  const [params] = useSearchParams();
  const trackedPromotionValue = params.get('promotionId') ?? '';
  const trackedPromotionId = /^[1-9]\d*$/.test(trackedPromotionValue) && Number.isSafeInteger(Number(trackedPromotionValue)) ? Number(trackedPromotionValue) : null;
  useEffect(() => { document.getElementById('product-deleted-feedback')?.focus(); }, [location.key]);
  const query = useApiQuery(getProducts, []);
  const products = query.data;
  const [filters, setFilters] = useState<ProductFilterState>(initialFilters);
  const [detailsDialog, setDetailsDialog] =
    useState<OpenDetailsDialog<CatalogProduct> | null>(null);
  const handleCloseDetails = useCallback(() => setDetailsDialog(null), []);

  const categories = Array.from(
    new Set(products.map((product) => product.categoryName)),
  );

  const search = normalize(filters.search);

  const filteredProducts = products.filter((product) => {
    const categoryMatches =
      !filters.category || product.categoryName === filters.category;
    return (
      categoryMatches &&
      (!search ||
        normalize(`${product.name} ${product.barcode}`).includes(search))
    );
  });

  return (
    <section className={styles.page} aria-labelledby="products-title">
      {typeof location.state === 'object' && location.state !== null && 'productDeleted' in location.state && location.state.productDeleted === true && <p id="product-deleted-feedback" tabIndex={-1} role="status">Produto excluído ou não disponível na consulta atual. A lista foi consultada novamente.</p>}
      <h1 className={styles["sr-only"]} id="products-title">
        Produtos
      </h1>

      <div className={styles.toolbar}>
        <ProductsFilters
          value={filters}
          categories={categories}
          onChange={setFilters}
        />
        <Link className={styles["new-product"]} to="/productsRegistration">
          <FontAwesomeIcon icon={faPlus} aria-hidden="true" /> Novo Produto
        </Link>
      </div>

      <p className={styles["sr-only"]} role="status" aria-live="polite">
        {query.status === 'success' ? `${filteredProducts.length} produtos encontrados.` : ''}
      </p>
      {query.status === 'loading' && <p role="status">Carregando produtos…</p>}
      {query.status === 'error' && <p role="alert">{query.error}</p>}

      {query.status === 'success' && <section className={styles.card} aria-labelledby="sku-list-title">
        <h2 className={styles["list-title"]} id="sku-list-title">
          Lista de SKUs
        </h2>
        <div
          className={styles["table-region"]}
          role="region"
          aria-label="Tabela de produtos rolável"
          aria-describedby="sku-table-scroll-hint"
          {...keyboardScrollProps}
        >
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Código de barras</th>
                <th scope="col">Produto</th>
                <th scope="col">Categoria</th>
                <th scope="col">SKU</th>
                <th scope="col">Unidade de medida</th>
                <th scope="col">Status</th>
                <th className={styles.center} scope="col">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id}>
                  <td>{product.barcode}</td>
                  <td>{product.name}</td>
                  <td>{product.categoryName}</td>
                  <td>{product.sku}</td>
                  <td>{product.unitMeasure}</td>
                  <td>{product.active ? 'Ativo' : 'Inativo'}</td>
                  <td className={styles.center}>
                    <button
                      className={`${styles["view-button"]} a11y-table-action table-action-transition`}
                      type="button"
                      onClick={(event) => setDetailsDialog({ record: product, trigger: event.currentTarget })}
                      aria-label={`Ver detalhes de ${product.name}`}
                      aria-haspopup="dialog"
                    >
                      Ver
                    </button>
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td className={styles.empty} colSpan={7}>
                    Nenhum produto corresponde aos filtros informados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className={styles["sr-only"]} id="sku-table-scroll-hint">
          Use as setas esquerda e direita para percorrer as colunas da tabela.
        </p>
      </section>}
      {detailsDialog && (
        <DetailsModal
          title={detailsDialog.record.name}
          description="Dados cadastrais do produto."
          fields={[
            { id: "barcode", label: "Código de barras", value: detailsDialog.record.barcode },
            { id: "category", label: "Categoria", value: detailsDialog.record.categoryName },
            { id: "sku", label: "SKU", value: detailsDialog.record.sku },
            { id: "status", label: "Status", value: detailsDialog.record.active ? 'Ativo' : 'Inativo' },
          ] satisfies DetailsModalField[]}
          triggerElement={detailsDialog.trigger}
          onClose={handleCloseDetails}
        >
          <Link className={styles["link"]} to={`/products/${detailsDialog.record.id}`}>
            Abrir cadastro detalhado
          </Link>
        </DetailsModal>
      )}
      <PromotionOperations trackedPromotionId={trackedPromotionId} />
    </section>
  );
}

export default Products;
