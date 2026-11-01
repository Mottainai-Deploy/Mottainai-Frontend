import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import HistoricalChart from "@/components/HistoricalChart";
import ReusableTable from "@/components/ReusableTable";
import StockFilters from "@/components/StockFilters";
import {
  buildCashDiscrepancyHistory,
  cashClosingDiscrepancies,
  stockStores,
} from "@/data/stock";
import type { ReusableTableColumn, TableCellTone } from "@/types/reusable-table.types";
import type {
  CashClosingDiscrepancy,
  CashClosingStatus,
  StockFilterState,
  StockPageState,
} from "@/types/stock.types";
import styles from "./style.module.css";

const statusTones: Record<CashClosingStatus, TableCellTone> = {
  "Não conciliado": "danger",
  "Em análise": "warning",
  Conferido: "success",
};

const initialState: StockPageState = {
  store: "",
};

function Stock() {
  const [state, setState] = useState<StockPageState>(initialState);

  const filteredDiscrepancies = useMemo(
    () =>
      cashClosingDiscrepancies.filter(
        (record) => !state.store || record.store === state.store,
      ),
    [state.store],
  );

  const discrepancyHistory = useMemo(
    () => buildCashDiscrepancyHistory(filteredDiscrepancies, []),
    [filteredDiscrepancies],
  );

  const updateFilters = (filters: StockFilterState) => {
    setState((currentState) => ({ ...currentState, ...filters }));
  };

  const columns: ReusableTableColumn<CashClosingDiscrepancy>[] = [
    { id: "date", header: "Data", renderCell: (record) => record.date },
    { id: "store", header: "Loja", renderCell: (record) => record.store },
    {
      id: "responsible",
      header: "Responsável",
      renderCell: (record) => record.responsible,
    },
    {
      id: "item",
      header: "Item",
      renderCell: (record) => record.item,
    },
    {
      id: "systemQuantity",
      header: "No sistema",
      renderCell: (record) => record.systemQuantity.toLocaleString("pt-BR"),
      align: "end",
    },
    {
      id: "soldQuantity",
      header: "Vendido",
      renderCell: (record) => record.soldQuantity.toLocaleString("pt-BR"),
      align: "end",
    },
    {
      id: "difference",
      header: "Diferença",
      renderCell: (record) =>
        `${record.difference > 0 ? "+" : ""}${record.difference.toLocaleString("pt-BR")} un`,
      align: "end",
    },
    {
      id: "status",
      header: "Status",
      renderCell: (record) => record.status,
      display: "badge",
      tone: (record) => statusTones[record.status],
      align: "center",
    },
    {
      id: "report",
      header: "Relatório",
      renderCell: (record) => (
        <Link
          className={`${styles.reportButton} a11y-table-action table-action-transition`}
          data-a11y-light-surface="true"
          to={`/stock/cash-closing/${record.id}`}
        >
          Ver relatório
          <span className={styles["sr-only"]}> de {record.item}</span>
        </Link>
      ),
      align: "center",
    },
  ];

  const resultLabel =
    filteredDiscrepancies.length === 1
      ? "1 divergência de fechamento encontrada."
      : `${filteredDiscrepancies.length} divergências de fechamento encontradas.`;

  return (
    <section className={styles.page} aria-labelledby="stock-title">
      <h1 className={styles["sr-only"]} id="stock-title">
        Divergências de fechamento de caixa
      </h1>

      <div className={styles.toolbar}>
        <StockFilters
          value={{ store: state.store }}
          stores={stockStores}
          onChange={updateFilters}
        />
        <Link className={styles.newCountButton} to="/stock/counts/new">
          <FontAwesomeIcon icon={faPlus} aria-hidden="true" />
          Nova contagem
        </Link>
      </div>

      <p className={styles["sr-only"]} role="status" aria-live="polite">
        {resultLabel}
      </p>

      <div className={styles.tableSection}>
        <ReusableTable
          title="Divergências de fechamento de caixa"
          columns={columns}
          data={filteredDiscrepancies}
          rowKey={(record) => record.id}
          emptyMessage="Nenhuma divergência corresponde ao filtro selecionado."
        />
      </div>

      <HistoricalChart
        data={discrepancyHistory}
        title="Fechamentos divergentes por dia"
        description="Cada item divergente permanece acumulado até ser conferido no relatório."
        period="Maio"
        datasetLabel="Fechamentos divergentes"
        ariaLabel="Gráfico de linha com a evolução diária dos fechamentos divergentes"
        beginAtZero
      />
    </section>
  );
}

export default Stock;
