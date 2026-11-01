import { useEffect, useId, useRef, useState } from "react";
import type { Chart as ChartInstance } from "chart.js";
import type { HistoricalChartProps } from "@/types/historical-chart.types";
import { useMinimumLoadingVisibility } from "@/hooks/useMinimumLoadingVisibility";
import styles from "./style.module.css";

function getThemeColor(variable: string, fallback: string): string {
  return window.getComputedStyle(document.documentElement).getPropertyValue(variable).trim() || fallback;
}

function hasDarkTheme(): boolean {
  return document.documentElement.getAttribute("data-a11y-theme") === "dark";
}

function hasHighContrast(): boolean {
  return document.documentElement.getAttribute("data-a11y-contrast") === "high";
}

function getTooltipColors(primaryColor: string): { backgroundColor: string; foregroundColor: string } {
  const darkTheme = hasDarkTheme();
  const highContrast = hasHighContrast();

  if (darkTheme && highContrast) {
    return {
      backgroundColor: primaryColor,
      foregroundColor: getThemeColor("--a11y-foreground-on-light", "#783800"),
    };
  }
  if (darkTheme) return { backgroundColor: primaryColor, foregroundColor: "#fff" };
  if (highContrast) return { backgroundColor: "#000", foregroundColor: "#fff" };
  return { backgroundColor: "#fff", foregroundColor: "#102a43" };
}

function getMotionFactor(): number {
  const value = window.getComputedStyle(document.documentElement).getPropertyValue("--a11y-motion-factor").trim();
  const factor = Number(value);
  return value && Number.isFinite(factor) ? factor : 1;
}

const formatMetricDate = (date: string) => new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
}).format(new Date(`${date}T12:00:00`));

function HistoricalChart({
  data,
  title = "Histórico do último mês",
  description = "Variação diária do índice de reaproveitamento",
  period = "31 dias",
  datasetLabel = "Índice histórico",
  ariaLabel = "Gráfico de linha com o histórico diário",
  compact = false,
  beginAtZero = false,
}: HistoricalChartProps) {
  const titleId = useId();
  const canvasId = useId();
  const descriptionId = useId();
  const [chartLoadStatus, setChartLoadStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const minimumChartLoadingVisible = useMinimumLoadingVisibility(chartLoadStatus === "loading");
  const showChartLoading = chartLoadStatus === "loading" || minimumChartLoadingVisible;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<ChartInstance<"line", number[], string> | null>(null);
  const activeDataPointIndexRef = useRef<number | null>(null);

  const activateDataPoint = (index: number) => {
    activeDataPointIndexRef.current = index;
    const chart = chartRef.current;
    const point = chart?.getDatasetMeta(0).data[index];
    if (!chart || !point) return;
    const activePoint = { datasetIndex: 0, index };
    chart.setActiveElements([activePoint]);
    chart.tooltip?.setActiveElements([activePoint], { x: point.x, y: point.y });
    chart.update("none");
  };

  const clearDataPoint = () => {
    activeDataPointIndexRef.current = null;
    const chart = chartRef.current;
    if (!chart) return;
    chart.setActiveElements([]);
    chart.tooltip?.setActiveElements([], { x: 0, y: 0 });
    chart.canvas.style.cursor = "default";
    chart.update("none");
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }

    let disposed = false;
    let intersectionObserver: IntersectionObserver | null = null;
    let themeObserver: MutationObserver | null = null;

    const initializeChart = async () => {
      if (disposed || !canvasRef.current) return;
      setChartLoadStatus("loading");
      try {
        const { Chart } = await import("./chartRuntime");

        if (disposed || !canvasRef.current) return;

        const root = document.documentElement;
        const primaryColor = getThemeColor("--motta-blue", "#102a43");
        const primaryRgb = getThemeColor("--a11y-foreground-rgb", "16, 42, 67");
        const foregroundColor = getThemeColor("--a11y-foreground", "#102a43");
        const tooltipColors = getTooltipColors(primaryColor);

        chartRef.current?.destroy();
        chartRef.current = new Chart(canvas, {
          type: "line",
          data: {
            labels: data.map((item) => formatMetricDate(item.date)),
            datasets: [
              {
                label: datasetLabel,
                data: data.map((item) => item.value),
                borderColor: "#c64c49",
                backgroundColor: "rgba(198, 76, 73, 0.12)",
                borderWidth: 3,
                pointBackgroundColor: "#c64c49",
                pointBorderColor: "#c64c49",
                pointBorderWidth: 1,
                pointRadius: data.length > 14 ? 2.5 : 4,
                pointHoverBackgroundColor: "#c64c49",
                pointHoverBorderColor: "#c64c49",
                pointHoverBorderWidth: 1,
                pointHoverRadius: data.length > 14 ? 4 : 6,
                pointHitRadius: 8,
                tension: 0.25,
                fill: true,
              },
            ],
          },
          options: {
            animation: { duration: 250 * getMotionFactor() },
            responsive: true,
            maintainAspectRatio: false,
            onHover: (_event, activeElements, chart) => {
              chart.canvas.style.cursor = activeElements.length > 0 ? "pointer" : "default";
            },
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: tooltipColors.backgroundColor,
                titleColor: tooltipColors.foregroundColor,
                bodyColor: tooltipColors.foregroundColor,
                borderColor: "#2d5778",
                borderWidth: 1,
                cornerRadius: 8,
                padding: 12,
                displayColors: false,
              },
            },
            scales: {
              y: {
                beginAtZero,
                ticks: { color: foregroundColor },
                grid: { color: `rgba(${primaryRgb}, 0.12)` },
              },
              x: {
                ticks: { color: foregroundColor, maxRotation: 45, minRotation: 0 },
                grid: { display: false },
              },
            },
          },
        });

        const activeIndex = activeDataPointIndexRef.current;
        const activeChart = chartRef.current;
        const activePoint = activeIndex === null
          ? undefined
          : activeChart?.getDatasetMeta(0).data[activeIndex];
        if (activeIndex !== null && activeChart && activePoint) {
          const activeSelection = { datasetIndex: 0, index: activeIndex };
          activeChart.setActiveElements([activeSelection]);
          activeChart.tooltip?.setActiveElements([activeSelection], {
            x: activePoint.x,
            y: activePoint.y,
          });
          activeChart.update("none");
        }

        themeObserver = new MutationObserver(() => {
          const activeChart = chartRef.current;
          if (!activeChart) return;
          const primary = getThemeColor("--motta-blue", "#102a43");
          const primaryRgbValue = getThemeColor("--a11y-foreground-rgb", "16, 42, 67");
          const foreground = getThemeColor("--a11y-foreground", "#102a43");
          const updatedTooltipColors = getTooltipColors(primary);
          const tooltip = activeChart.options.plugins?.tooltip;
          if (tooltip) {
            tooltip.backgroundColor = updatedTooltipColors.backgroundColor;
            tooltip.titleColor = updatedTooltipColors.foregroundColor;
            tooltip.bodyColor = updatedTooltipColors.foregroundColor;
          }
          if (activeChart.options.scales?.x?.ticks) activeChart.options.scales.x.ticks.color = foreground;
          if (activeChart.options.scales?.y?.ticks) activeChart.options.scales.y.ticks.color = foreground;
          if (activeChart.options.scales?.y?.grid) activeChart.options.scales.y.grid.color = `rgba(${primaryRgbValue}, 0.12)`;
          activeChart.options.animation = { duration: 250 * getMotionFactor() };
          activeChart.update("none");
        });
        themeObserver.observe(root, { attributes: true, attributeFilter: ["data-a11y-theme", "data-a11y-contrast", "data-a11y-motion"] });
        setChartLoadStatus("success");
      } catch {
        if (!disposed) setChartLoadStatus("error");
      }
    };

    if (typeof IntersectionObserver === "undefined") {
      void initializeChart();
    } else {
      intersectionObserver = new IntersectionObserver((entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        intersectionObserver?.disconnect();
        void initializeChart();
      });
      intersectionObserver.observe(canvas);
    }

    return () => {
      disposed = true;
      intersectionObserver?.disconnect();
      themeObserver?.disconnect();
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [beginAtZero, data, datasetLabel]);

  return (
    <section
      className={`${styles.card} ${compact ? styles.compact : ""}`}
      aria-labelledby={titleId}
    >
      <div className={styles.heading}>
        <div>
          <h2 id={titleId}>{title}</h2>
          <p>{description}</p>
        </div>
        <span className={styles.period}>{period}</span>
      </div>
      <div className={styles.chartArea} aria-busy={showChartLoading}>
        <canvas
          id={canvasId}
          ref={canvasRef}
          role="img"
          aria-label={ariaLabel}
          aria-describedby={descriptionId}
        />
      </div>
      {showChartLoading && (
        <p className={styles["sr-only"]} role="status">Carregando gráfico.</p>
      )}
      {!showChartLoading && chartLoadStatus === "success" && (
        <p className={styles["sr-only"]} role="status">Gráfico carregado.</p>
      )}
      {!showChartLoading && chartLoadStatus === "error" && (
        <p className={styles.dataDetails} role="alert">
          Não foi possível carregar o gráfico. Os valores continuam disponíveis em “Ver dados do gráfico”.
        </p>
      )}
      <p className={styles["sr-only"]} id={descriptionId}>
        {description}. {data.length} pontos disponíveis. Dados: {data.map((item) => `${formatMetricDate(item.date)}: ${item.value}. `)}
      </p>
      <details className={styles.dataDetails}>
        <summary>Ver dados do gráfico</summary>
        <ul>
          {data.map((item, index) => (
            <li key={item.date}>
              <button
                className={styles.dataPoint}
                type="button"
                aria-label={`${formatMetricDate(item.date)}: ${item.value}, ${datasetLabel}. Focar para destacar este ponto no gráfico.`}
                onFocus={() => activateDataPoint(index)}
                onBlur={clearDataPoint}
                onClick={() => activateDataPoint(index)}
              >
                <time dateTime={item.date}>{formatMetricDate(item.date)}</time>
                <span>{item.value} — {datasetLabel}</span>
              </button>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}

export default HistoricalChart;
