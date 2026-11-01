import DropdownSelect from "@/components/DropdownSelect";
import Spinner from "@/components/Spinner";
import { useMinimumLoadingVisibility } from "@/hooks/useMinimumLoadingVisibility";
import type { ProductDraft } from "@/types/product-import.types";
import type { SingleProductFormProps } from "@/types/product-registration-ui.types";
import styles from "@/pages/ProductsRegistration/style.module.css";

const categories = ["Açougue", "Congelados", "Horti-Fruti", "Laticínios"];
const measurementUnits = ["Unidade", "Quilograma", "Litro", "Caixa"];
const suppliers = ["Serjão da massa", "Distribuidora Central", "Fornecedor local"];

function SingleProductForm({ mode, draft, onSubmit, onDraftChange, onCancel }: SingleProductFormProps) {
  const minimumRegistrationLoadingVisible = useMinimumLoadingVisibility(draft.status === "registering");
  const showRegistrationLoading = draft.status === "registering" || minimumRegistrationLoadingVisible;
  const fieldErrorIds: Record<keyof ProductDraft, string> = {
    sku: "product-sku-error",
    barcode: "product-barcode-error",
    name: "product-name-error",
    category: "product-category-error",
    brand: "product-brand-error",
    measurementUnit: "product-measurement-unit-error",
    supplier: "product-supplier-error",
  };

  return (
    <div
      id="single-registration-panel"
      hidden={mode !== "single"}
      role="tabpanel"
      aria-labelledby="single-registration-tab"
      tabIndex={0}
    >
      <form
        id="single-registration-form"
        aria-labelledby="single-registration-tab"
        onSubmit={onSubmit}
        className={styles["single-form"]}
      >
        <div className={styles["form-grid"]}>
          <label htmlFor="product-sku">
            SKU
            <input
              id="product-sku"
              maxLength={64}
              value={draft.values.sku}
              onChange={(event) => onDraftChange("sku", event.target.value)}
              aria-invalid={Boolean(draft.errors.sku)}
              aria-describedby={draft.errors.sku ? fieldErrorIds.sku : undefined}
            />
            {draft.errors.sku && <span className={styles.fieldError} id={fieldErrorIds.sku} role="alert">{draft.errors.sku}</span>}
          </label>
          <label htmlFor="product-barcode">
            Código de barras
            <input
              id="product-barcode"
              maxLength={32}
              value={draft.values.barcode}
              onChange={(event) => onDraftChange("barcode", event.target.value)}
              aria-invalid={Boolean(draft.errors.barcode)}
              aria-describedby={draft.errors.barcode ? fieldErrorIds.barcode : undefined}
            />
            {draft.errors.barcode && <span className={styles.fieldError} id={fieldErrorIds.barcode} role="alert">{draft.errors.barcode}</span>}
          </label>
          <label className={styles.wide} htmlFor="product-name">
            Nome do produto
            <input
              id="product-name"
              maxLength={120}
              value={draft.values.name}
              onChange={(event) => onDraftChange("name", event.target.value)}
              aria-invalid={Boolean(draft.errors.name)}
              aria-describedby={draft.errors.name ? fieldErrorIds.name : undefined}
            />
            {draft.errors.name && <span className={styles.fieldError} id={fieldErrorIds.name} role="alert">{draft.errors.name}</span>}
          </label>
          <label htmlFor="product-category">
            Categoria
            <DropdownSelect
              id="product-category"
              value={draft.values.category}
              onChange={(event) => onDraftChange("category", event.target.value)}
              ariaInvalid={Boolean(draft.errors.category)}
              ariaDescribedBy={draft.errors.category ? fieldErrorIds.category : undefined}
            >
              <option value="">Selecione</option>
              {categories.map((item) => <option key={item}>{item}</option>)}
            </DropdownSelect>
            {draft.errors.category && <span className={styles.fieldError} id={fieldErrorIds.category} role="alert">{draft.errors.category}</span>}
          </label>
          <label htmlFor="product-brand">
            Marca
            <input
              id="product-brand"
              maxLength={100}
              value={draft.values.brand}
              onChange={(event) => onDraftChange("brand", event.target.value)}
              aria-invalid={Boolean(draft.errors.brand)}
              aria-describedby={draft.errors.brand ? fieldErrorIds.brand : undefined}
            />
            {draft.errors.brand && <span className={styles.fieldError} id={fieldErrorIds.brand} role="alert">{draft.errors.brand}</span>}
          </label>
          <label htmlFor="product-measurement-unit">
            Unidade de medida
            <DropdownSelect
              id="product-measurement-unit"
              value={draft.values.measurementUnit}
              onChange={(event) => onDraftChange("measurementUnit", event.target.value)}
              ariaInvalid={Boolean(draft.errors.measurementUnit)}
              ariaDescribedBy={draft.errors.measurementUnit ? fieldErrorIds.measurementUnit : undefined}
            >
              <option value="">Selecione</option>
              {measurementUnits.map((item) => <option key={item}>{item}</option>)}
            </DropdownSelect>
            {draft.errors.measurementUnit && <span className={styles.fieldError} id={fieldErrorIds.measurementUnit} role="alert">{draft.errors.measurementUnit}</span>}
          </label>
          <label htmlFor="product-supplier">
            Fornecedor
            <DropdownSelect
              id="product-supplier"
              value={draft.values.supplier}
              onChange={(event) => onDraftChange("supplier", event.target.value)}
              ariaInvalid={Boolean(draft.errors.supplier)}
              ariaDescribedBy={draft.errors.supplier ? fieldErrorIds.supplier : undefined}
            >
              <option value="">Selecione</option>
              {suppliers.map((item) => <option key={item}>{item}</option>)}
            </DropdownSelect>
            {draft.errors.supplier && <span className={styles.fieldError} id={fieldErrorIds.supplier} role="alert">{draft.errors.supplier}</span>}
          </label>
        </div>
        <div className={styles.actions}>
          <button className={styles.primary} type="submit" disabled={draft.status === "registering" || showRegistrationLoading}>
            {showRegistrationLoading ? <Spinner label="Cadastrando" /> : "Cadastrar produto"}
          </button>
          <button className={styles.secondary} type="button" onClick={onCancel}>
            Cancelar cadastro
          </button>
        </div>
        {draft.message && (
          <p
            className={draft.status === "error" ? styles.error : styles.message}
            role={draft.status === "error" ? "alert" : "status"}
          >
            {draft.message}
          </p>
        )}
      </form>
    </div>
  );
}

export default SingleProductForm;
