import ReusableTable from "@/components/ReusableTable";
import { faCheck, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Spinner from "@/components/Spinner";
import { useMinimumLoadingVisibility } from "@/hooks/useMinimumLoadingVisibility";
import type { ProductImportPreviewItem } from "@/types/product-import.types";
import type { ProductRegistrationDialogsProps } from "@/types/product-registration-ui.types";
import type { ReusableTableColumn } from "@/types/reusable-table.types";
import styles from "@/pages/ProductsRegistration/style.module.css";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const previewColumns: ReusableTableColumn<ProductImportPreviewItem>[] = [
  { id: "item", header: "Item", renderCell: (item) => item.itemName },
  { id: "barcode", header: "Código de barras", renderCell: (item) => item.barcode },
  { id: "quantity", header: "Qtd.", renderCell: (item) => item.quantity },
  {
    id: "value",
    header: "Val. unit.",
    renderCell: (item) => currencyFormatter.format(item.unitPriceInCents / 100),
  },
  { id: "expiration", header: "Validade", renderCell: (item) => item.expirationDate },
  {
    id: "cost",
    header: "Novo custo",
    renderCell: (item) => currencyFormatter.format(item.newCostInCents / 100),
  },
  {
    id: "suggestion",
    header: "Preço sugerido",
    renderCell: (item) => currencyFormatter.format(item.suggestedPriceInCents / 100),
    display: "badge",
    tone: () => "success",
  },
];

function ProductRegistrationDialogs({
  previewItems,
  status,
  successModal,
  closingModal,
  modalPrimaryRef,
  onClosePreview,
  onRegisterProducts,
  onReviewFirstProduct,
  onCloseSuccess,
  onBackToProducts,
}: ProductRegistrationDialogsProps) {
  const minimumRegistrationLoadingVisible = useMinimumLoadingVisibility(status === "registering");
  const showRegistrationLoading = status === "registering" || minimumRegistrationLoadingVisible;
  const previewOpen = previewItems.length > 0;

  return (
    <>
      {previewOpen && (
        <div className={`${styles.backdrop} ${closingModal === "preview" ? styles.backdropClosing : ""}`}>
          <section
            className={`${styles.modal} ${closingModal === "preview" ? styles.modalClosing : ""}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="preview-title"
          >
            <header>
              <h2 id="preview-title">Prévia do processamento</h2>
              <button type="button" aria-label="Fechar prévia" onClick={onClosePreview}>
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </header>
            <ReusableTable
              title="Produtos encontrados"
              columns={previewColumns}
              data={previewItems}
              rowKey={(item) => item.id}
            />
            <div className={styles.actions}>
              <button
                ref={modalPrimaryRef}
                className={styles.primary}
                type="button"
                onClick={onRegisterProducts}
                disabled={status === "registering" || showRegistrationLoading}
              >
                {showRegistrationLoading ? <Spinner label="Cadastrando" /> : "Cadastrar no banco"}
              </button>
              <button className={styles.secondary} type="button" onClick={onReviewFirstProduct}>
                Revisar e editar primeiro produto
              </button>
            </div>
          </section>
        </div>
      )}
      {successModal.isOpen && (
        <div className={`${styles.backdrop} ${closingModal === "success" ? styles.backdropClosing : ""}`}>
          <section
            className={`${styles.modal} ${styles.success} ${closingModal === "success" ? styles.modalClosing : ""}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="success-title"
          >
            <span className={styles["success-icon"]}>
              <FontAwesomeIcon icon={faCheck} />
            </span>
            <h2 id="success-title">{successModal.title}</h2>
            <p>{successModal.message}</p>
            <div className={styles.actions}>
              <button
                ref={modalPrimaryRef}
                className={styles.primary}
                type="button"
                onClick={onCloseSuccess}
              >
                Continuar cadastrando
              </button>
              <button className={styles.secondary} type="button" onClick={onBackToProducts}>
                Voltar para produtos
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

export default ProductRegistrationDialogs;
