import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import DetailsModal from "@/components/DetailsModal";
import ProductsFilters from "@/components/ProductsFilters";
import { products } from "@/data/products";
import type { DetailsModalField, OpenDetailsDialog } from "@/types/details-modal.types";
import type {
  EngineActionLevel,
  ProductFilterState,
  Product,
  ProductTrafficLight,
} from "@/types/product.types";
import styles from "./style.module.css";

const engineActionLevels: Record<ProductTrafficLight, EngineActionLevel> = {
  regular: "Moderado",
  attention: "Alto",
  critical: "Crítico",
};

const initialFilters: ProductFilterState = { search: "", category: "" };
// Keyboard focus lets users scroll the product table horizontally without a pointer.
const keyboardScrollProps = { tabIndex: 0 } as const;

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();

function Products() {
  const [filters, setFilters] = useState<ProductFilterState>(initialFilters);
  const [detailsDialog, setDetailsDialog] =
    useState<OpenDetailsDialog<Product> | null>(null);
  const handleCloseDetails = useCallback(() => setDetailsDialog(null), []);

  const categories = Array.from(
    new Set(products.map((product) => product.category)),
  );

  const search = normalize(filters.search);

  const filteredProducts = products.filter((product) => {
    const categoryMatches =
      !filters.category || product.category === filters.category;
    return (
      categoryMatches &&
      (!search ||
        normalize(`${product.name} ${product.barcode}`).includes(search))
    );
  });

  return (
    <section className={styles.page} aria-labelledby="products-title">
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
        {filteredProducts.length} produtos encontrados.
      </p>

      <section className={styles.card} aria-labelledby="sku-list-title">
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
                <th scope="col">Fornecedor</th>
                <th scope="col">Estoque</th>
                <th scope="col">Gôndola</th>
                <th scope="col">Preço</th>
                <th className={styles.center} scope="col">
                  Nível
                </th>
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
                  <td>{product.category}</td>
                  <td>{product.supplier}</td>
                  <td>{product.stockQuantity}</td>
                  <td>{product.shelfQuantity}</td>
                  <td>
                    {currencyFormatter.format(product.priceInCents / 100)}
                  </td>
                  <td className={styles.center}>
                    <span className={`${styles.levelBadge} ${styles[product.trafficLight]}`}>
                      {engineActionLevels[product.trafficLight]}
                    </span>
                  </td>
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
                  <td className={styles.empty} colSpan={9}>
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
      </section>
      {detailsDialog && (
        <DetailsModal
          title={detailsDialog.record.name}
          description="Resumo cadastral do produto; o diagnóstico completo permanece disponível na página detalhada."
          fields={[
            { id: "barcode", label: "Código de barras", value: detailsDialog.record.barcode },
            { id: "category", label: "Categoria", value: detailsDialog.record.category },
            { id: "supplier", label: "Fornecedor", value: detailsDialog.record.supplier },
            { id: "stock", label: "Estoque", value: `${detailsDialog.record.stockQuantity} unidades` },
            { id: "shelf", label: "Gôndola", value: `${detailsDialog.record.shelfQuantity} unidades` },
            { id: "price", label: "Preço atual", value: currencyFormatter.format(detailsDialog.record.priceInCents / 100) },
            { id: "level", label: "Nível", value: engineActionLevels[detailsDialog.record.trafficLight] },
          ] satisfies DetailsModalField[]}
          triggerElement={detailsDialog.trigger}
          onClose={handleCloseDetails}
        >
          <Link className={styles["link"]} to={`/products/${detailsDialog.record.id}`}>
            Abrir diagnóstico detalhado
          </Link>
        </DetailsModal>
      )}
    </section>
  );
}

export default Products;
