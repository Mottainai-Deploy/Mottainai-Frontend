import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import DetailsModal from "@/components/DetailsModal";
import HistoricalChart from "@/components/HistoricalChart";
import ReusableTable from "@/components/ReusableTable";
import { getProductDetails } from "@/services/productDetailsService";
import { useMinimumLoadingVisibility } from "@/hooks/useMinimumLoadingVisibility";
import type {
  ProductActionHistory,
  ProductDetail,
  ProductDetailsState,
  ProductSummaryRow,
} from "@/types/product-details.types";
import type { DetailsModalField, OpenDetailsDialog } from "@/types/details-modal.types";
import type { ReusableTableColumn } from "@/types/reusable-table.types";
import styles from "./style.module.css";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const summaryColumns: ReusableTableColumn<ProductSummaryRow>[] = [
  {
    id: "leftLabel",
    header: "Informação",
    renderCell: (row) => <strong>{row.leftLabel}</strong>,
  },
  { id: "leftValue", header: "Valor", renderCell: (row) => row.leftValue },
  {
    id: "rightLabel",
    header: "Estoque e previsão",
    renderCell: (row) => <strong>{row.rightLabel}</strong>,
  },
  {
    id: "rightValue",
    header: "Valor",
    renderCell: (row) =>
      row.highlightRightValue ? (
        <span className={styles.warning}>{row.rightValue}</span>
      ) : (
        row.rightValue
      ),
  },
];

function createHistoryColumns(
  onViewAction: (item: ProductActionHistory, trigger: HTMLButtonElement) => void,
): ReusableTableColumn<ProductActionHistory>[] {
  return [
    { id: "date", header: "Data", renderCell: (item) => item.date },
    { id: "tactic", header: "Tática", renderCell: (item) => item.tactic },
    { id: "decision", header: "Decisão", renderCell: (item) => item.decision },
    {
      id: "efficacy",
      header: "Eficácia",
      renderCell: (item) => item.efficacy,
      display: "badge",
      tone: (item) => item.efficacyTone,
    },
    {
      id: "action",
      header: "Ação",
      renderCell: () => null,
      display: "action",
      actionLabel: (item) => `Ver ação ${item.tactic}`,
      onAction: (item, event) => onViewAction(item, event.currentTarget),
      align: "center",
    },
  ];
}

const initialState: ProductDetailsState = {
  status: "loading",
  requestedProductId: null,
  data: null,
  message: "Carregando detalhes do produto...",
};

function createSummary(product: ProductDetail): ProductSummaryRow[] {
  return [
    {
      id: "sku",
      leftLabel: "SKU",
      leftValue: product.sku,
      rightLabel: "Produtos em estoque",
      rightValue: `${product.stockQuantity} un`,
    },
    {
      id: "category",
      leftLabel: "Categoria",
      leftValue: product.category,
      rightLabel: "Produtos na gôndola",
      rightValue: `${product.shelfQuantity} un`,
    },
    {
      id: "supplier",
      leftLabel: "Fornecedor",
      leftValue: product.supplier,
      rightLabel: "Produtos no total",
      rightValue: `${product.stockQuantity + product.shelfQuantity} un`,
    },
    {
      id: "price",
      leftLabel: "Preço atual",
      leftValue: money.format(product.priceInCents / 100),
      rightLabel: "Velocidade de saída",
      rightValue: `${product.salesVelocityPerDay} un/dia`,
    },
    {
      id: "cost",
      leftLabel: "Custo médio",
      leftValue: money.format(product.averageCostInCents / 100),
      rightLabel: "Shelf life efetivo",
      rightValue: `${product.effectiveShelfLifeDays} dias para escoar`,
      highlightRightValue: true,
    },
    {
      id: "margin",
      leftLabel: "Margem",
      leftValue: `${product.marginPercent.toLocaleString("pt-BR")}%`,
      rightLabel: "Lote mais próximo do vencimento",
      rightValue: `${product.nextExpirationLot} · ${product.nextExpirationDays} dias`,
      highlightRightValue: true,
    },
  ];
}

function ProductDetails() {
  const { productId } = useParams<{ productId: string }>();
  const [state, setState] = useState<ProductDetailsState>(initialState);
  const isProductLoading = state.status === "loading" || state.requestedProductId !== productId;
  const minimumLoadingVisible = useMinimumLoadingVisibility(isProductLoading);
  const showLoading = isProductLoading || minimumLoadingVisible;
  const [detailsDialog, setDetailsDialog] =
    useState<OpenDetailsDialog<ProductActionHistory> | null>(null);
  const handleCloseDetails = useCallback(() => setDetailsDialog(null), []);
  const handleViewAction = (item: ProductActionHistory, trigger: HTMLButtonElement) => {
    setDetailsDialog({ record: item, trigger });
  };

  useEffect(() => {
    if (!productId) return undefined;

    let active = true;

    getProductDetails(productId)
      .then((product) => {
        if (active)
          setState(
            product
              ? { status: "success", requestedProductId: productId, data: product, message: "" }
              : {
                  status: "error",
                  requestedProductId: productId,
                  data: null,
                  message: "Produto não encontrado.",
                },
          );
      })
      .catch((error: unknown) => {
        if (active)
          setState({
            status: "error",
            requestedProductId: productId,
            data: null,
            message:
              error instanceof Error
                ? error.message
                : "Não foi possível carregar o produto.",
          });
      });

    return () => {
      active = false;
    };
  }, [productId]);
  if (!productId)
    return (
      <section className={styles.feedback}>
        <h1>Detalhes do produto</h1>
        <p role="alert">
          O identificador do produto não foi informado.
        </p>
        <Link className={styles.back} to="/products">
          <FontAwesomeIcon icon={faArrowLeft} /> Voltar para produtos
        </Link>
      </section>
    );

  if (showLoading)
    return (
      <p className={styles.status} role="status">
        {state.requestedProductId === productId
          ? state.message
          : "Carregando detalhes do produto..."}
      </p>
    );

  if (state.status === "error" || !state.data)
    return (
      <section className={styles.feedback}>
        <h1>Detalhes do produto</h1>
        <p role="alert">{state.message}</p>
        <Link className={styles.back} to="/products">
          <FontAwesomeIcon icon={faArrowLeft} /> Voltar para produtos
        </Link>
      </section>
    );

  const product = state.data;
  const historyColumns = createHistoryColumns(handleViewAction);
  const actionFields: DetailsModalField[] = detailsDialog
    ? [
        { id: "product", label: "Produto", value: product.name },
        { id: "sku", label: "SKU", value: product.sku },
        { id: "date", label: "Data", value: detailsDialog.record.date },
        { id: "tactic", label: "Ação do motor", value: detailsDialog.record.tactic },
        { id: "decision", label: "Decisão", value: detailsDialog.record.decision },
        { id: "efficacy", label: "Resultado registrado", value: detailsDialog.record.efficacy },
      ]
    : [];

  return (
    <section className={styles.page} aria-labelledby="product-title">
      <Link className={styles.back} to="/products">
        <FontAwesomeIcon icon={faArrowLeft} /> Voltar para produtos
      </Link>

      <header className={styles.heading}>
        <div>
          <p>Diagnóstico preditivo</p>
          <h1 id="product-title">{product.name}</h1>
        </div>
        <span>Código de barras: {product.barcode}</span>
      </header>

      <ReusableTable
        title="Informações e previsão do produto"
        columns={summaryColumns}
        data={createSummary(product)}
        rowKey={(row) => row.id}
      />

      <HistoricalChart
        data={product.monthlySavedProfit}
        title="Lucro salvo — evolução mensal"
        description="Valor preservado pelas ações recomendadas para este SKU"
        period="6 meses"
        datasetLabel="Lucro salvo (R$)"
        ariaLabel={`Gráfico de lucro salvo para ${product.name}`}
        compact
      />

      <ReusableTable
        title="Histórico de ações do motor para este SKU"
        columns={historyColumns}
        data={product.actionHistory}
        rowKey={(item) => item.id}
      />
      {detailsDialog && (
        <DetailsModal
          title="Detalhes da ação do motor"
          description="Dados registrados no histórico de ações deste produto."
          fields={actionFields}
          triggerElement={detailsDialog.trigger}
          onClose={handleCloseDetails}
        />
      )}
    </section>
  );
}

export default ProductDetails;
