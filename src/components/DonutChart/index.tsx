import { useEffect, useId, useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import type { ArcElement, Chart as ChartInstance, Plugin } from 'chart.js';
import type { DonutChartProps } from '@/types/donut-chart.types';
import { useMinimumLoadingVisibility } from '@/hooks/useMinimumLoadingVisibility';
import styles from './style.module.css';

function getThemeColor(variable: string, fallback: string): string {
  return window.getComputedStyle(document.documentElement).getPropertyValue(variable).trim() || fallback;
}

function getMotionFactor(): number {
  const value = window.getComputedStyle(document.documentElement).getPropertyValue("--a11y-motion-factor").trim();
  const factor = Number(value);
  return value && Number.isFinite(factor) ? factor : 1;
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

const highContrastPalette = ["#ff00aa", "#ffd700", "#00ffff", "#ff4d4d", "#00ff66"];

function getSegmentDisplayColor(
  segment: DonutChartProps["segments"][number],
  index: number,
  darkTheme: boolean,
  highContrast: boolean,
): string {
  if (highContrast) {
    const identity = `${segment.id} ${segment.label}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    if (identity.includes("critical") || identity.includes("critico")) return "#ff4d4d";
    if (identity.includes("attention") || identity.includes("alto")) return "#ffd700";
    if (identity.includes("regular") || identity.includes("moderado")) return "#00ffff";
    return highContrastPalette[index % highContrastPalette.length];
  }

  const color = segment.color;
  const match = color.match(/^#([\da-f]{3}|[\da-f]{6})$/i);
  if (!darkTheme || !match) return color;

  const hex = match[1].length === 3
    ? match[1].split("").map((digit) => `${digit}${digit}`).join("")
    : match[1];
  const brightened = hex.match(/[\da-f]{2}/gi)?.map((channel) =>
    Math.round(Number.parseInt(channel, 16) + (255 - Number.parseInt(channel, 16)) * 0.42),
  );
  return brightened ? `#${brightened.map((channel) => channel.toString(16).padStart(2, "0")).join("")}` : color;
}

function createHatchPattern(
  context: CanvasRenderingContext2D,
  color: string,
  patternIndex: number,
): string | CanvasPattern {
  const tile = document.createElement("canvas");
  tile.width = 12;
  tile.height = 12;
  const tileContext = tile.getContext("2d");
  if (!tileContext) return color;

  tileContext.fillStyle = color;
  tileContext.fillRect(0, 0, tile.width, tile.height);
  tileContext.strokeStyle = "#000";
  tileContext.fillStyle = "#000";
  tileContext.lineWidth = 2;

  if (patternIndex % 3 === 0) {
    tileContext.beginPath();
    tileContext.moveTo(-3, 12);
    tileContext.lineTo(12, -3);
    tileContext.moveTo(3, 15);
    tileContext.lineTo(15, 3);
    tileContext.stroke();
  } else if (patternIndex % 3 === 1) {
    for (const x of [3, 9]) {
      for (const y of [3, 9]) {
        tileContext.beginPath();
        tileContext.arc(x, y, 1.5, 0, Math.PI * 2);
        tileContext.fill();
      }
    }
  } else {
    tileContext.beginPath();
    tileContext.moveTo(-3, 12);
    tileContext.lineTo(12, -3);
    tileContext.moveTo(0, -3);
    tileContext.lineTo(15, 12);
    tileContext.stroke();
  }

  return context.createPattern(tile, "repeat") ?? color;
}

interface DonutLabelPlacement {
  side: "left" | "right";
  anchorX: number;
  anchorY: number;
  elbowX: number;
  elbowY: number;
  text: string;
  labelY: number;
}

function createHighContrastLabelPlugin(): Plugin<"doughnut"> {
  return {
    id: "high-contrast-donut-labels",
    afterDatasetsDraw(chart) {
      if (!hasHighContrast()) return;

      const arcs = chart.getDatasetMeta(0).data as ArcElement[];
      const values = chart.data.datasets[0]?.data ?? [];
      const placements: DonutLabelPlacement[] = [];

      arcs.forEach((arc, index) => {
        const value = values[index];
        if (typeof value !== "number" || value <= 0) return;

        const angle = (arc.startAngle + arc.endAngle) / 2;
        const directionX = Math.cos(angle);
        const directionY = Math.sin(angle);
        const side = directionX >= 0 ? "right" : "left";
        const elbowRadius = arc.outerRadius + 12;
        placements.push({
          side,
          anchorX: arc.x + directionX * arc.outerRadius,
          anchorY: arc.y + directionY * arc.outerRadius,
          elbowX: arc.x + directionX * elbowRadius,
          elbowY: arc.y + directionY * elbowRadius,
          text: `${chart.data.labels?.[index] ?? "Categoria"}: ${value}`,
          labelY: arc.y + directionY * elbowRadius,
        });
      });

      const context = chart.ctx;
      context.save();
      context.font = "600 12px system-ui, sans-serif";
      context.fillStyle = "#fff";
      context.strokeStyle = "#fff";
      context.lineWidth = 2;
      context.lineCap = "round";
      context.lineJoin = "round";

      for (const side of ["left", "right"] as const) {
        const sidePlacements = placements
          .filter((placement) => placement.side === side)
          .sort((first, second) => first.labelY - second.labelY);
        const minY = 16;
        const maxY = chart.height - 16;
        const gap = Math.min(24, (maxY - minY) / Math.max(1, sidePlacements.length - 1));

        sidePlacements.forEach((placement, index) => {
          const desiredY = Math.max(minY, Math.min(maxY, placement.labelY));
          placement.labelY = index === 0 ? desiredY : Math.max(desiredY, sidePlacements[index - 1].labelY + gap);
        });

        const lastPlacement = sidePlacements[sidePlacements.length - 1];
        const overflow = Math.max(0, (lastPlacement?.labelY ?? maxY) - maxY);
        sidePlacements.forEach((placement) => {
          placement.labelY -= overflow;
          const textX = side === "left" ? 8 : chart.width - 8;
          const lineEndX = side === "left" ? 5 : chart.width - 5;
          context.textAlign = side === "left" ? "left" : "right";
          context.beginPath();
          context.moveTo(placement.anchorX, placement.anchorY);
          context.lineTo(placement.elbowX, placement.elbowY);
          context.lineTo(lineEndX, placement.labelY);
          context.stroke();
          context.fillText(placement.text, textX, placement.labelY - 2);
        });
      }

      context.restore();
    },
  };
}

function DonutChart({ title, description, segments, centerLabel = 'Total', valueLabel = 'itens', note }: DonutChartProps) {
  const titleId = useId();
  const descriptionId = useId();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<ChartInstance<'doughnut', number[], string> | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [darkTheme, setDarkTheme] = useState(hasDarkTheme);
  const [highContrast, setHighContrast] = useState(hasHighContrast);
  const [chartLoadStatus, setChartLoadStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const minimumChartLoadingVisible = useMinimumLoadingVisibility(chartLoadStatus === 'loading');
  const showChartLoading = chartLoadStatus === 'loading' || minimumChartLoadingVisible;
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const activeSegment = activeIndex === null ? null : segments[activeIndex];

  useEffect(() => {
    const canvas = canvasRef.current;
    const canvasContext = canvas?.getContext("2d");
    if (!canvas || !canvasContext) {
      return undefined;
    }

    let disposed = false;
    let intersectionObserver: IntersectionObserver | null = null;
    let themeObserver: MutationObserver | null = null;
    let chart: ChartInstance<'doughnut', number[], string> | null = null;

    const initializeChart = async () => {
      setChartLoadStatus('loading');

      try {
        const { Chart } = await import('./chartRuntime');
        if (disposed || !canvasRef.current) return;

        const root = document.documentElement;
        const initialDarkTheme = hasDarkTheme();
        const initialHighContrast = hasHighContrast();
        const surfaceColor = getThemeColor("--a11y-surface", "#ffffff");
        const primaryColor = getThemeColor("--motta-blue", "#102a43");
        const tooltipColors = getTooltipColors(primaryColor);

        const chartInstance = new Chart(canvas, {
          type: 'doughnut',
          data: {
            labels: segments.map((segment) => segment.label),
            datasets: [{
              data: segments.map((segment) => segment.value),
              backgroundColor: segments.map((segment, index) => {
                const color = getSegmentDisplayColor(segment, index, initialDarkTheme, initialHighContrast);
                return initialHighContrast ? createHatchPattern(canvasContext, color, index) : color;
              }),
              borderColor: initialHighContrast ? segments.map(() => "#fff") : surfaceColor,
              borderWidth: initialHighContrast ? segments.map(() => 3) : 3,
              borderAlign: initialHighContrast ? "inner" : "center",
              spacing: initialHighContrast ? 5 : 0,
              hoverOffset: 8,
              hoverBorderColor: initialHighContrast ? "#fff" : surfaceColor,
              hoverBorderWidth: 3,
            }],
          },
          options: {
            animation: { duration: 250 * getMotionFactor() },
            responsive: true,
            maintainAspectRatio: false,
            cutout: '68%',
            layout: { padding: initialHighContrast ? { top: 14, right: 92, bottom: 14, left: 92 } : 0 },
            onHover: (_event, activeElements, hoveredChart) => {
              const index = activeElements[0]?.index ?? null;
              hoveredChart.canvas.style.cursor = index === null ? 'default' : 'pointer';
              setActiveIndex(index);
            },
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: tooltipColors.backgroundColor,
                titleColor: tooltipColors.foregroundColor,
                bodyColor: tooltipColors.foregroundColor,
                borderColor: '#2d5778',
                borderWidth: 1,
                cornerRadius: 8,
                padding: 12,
                callbacks: {
                  label: (context) => `${context.label}: ${context.formattedValue} ${valueLabel}`,
                },
              },
            },
          },
          plugins: [createHighContrastLabelPlugin()],
        });

        chart = chartInstance;
        chartRef.current = chartInstance;
        themeObserver = new MutationObserver(() => {
          const dark = hasDarkTheme();
          const highContrastEnabled = hasHighContrast();
          setDarkTheme(dark);
          setHighContrast(highContrastEnabled);
          const surface = getThemeColor("--a11y-surface", "#ffffff");
          const primary = getThemeColor("--motta-blue", "#102a43");
          const updatedTooltipColors = getTooltipColors(primary);
          chartInstance.data.datasets[0].borderColor = highContrastEnabled ? segments.map(() => "#fff") : surface;
          chartInstance.data.datasets[0].borderWidth = highContrastEnabled ? segments.map(() => 3) : 3;
          chartInstance.data.datasets[0].borderAlign = highContrastEnabled ? "inner" : "center";
          chartInstance.data.datasets[0].spacing = highContrastEnabled ? 5 : 0;
          const chartContext = chartInstance.ctx;
          chartInstance.data.datasets[0].backgroundColor = segments.map((segment, index) => {
            const color = getSegmentDisplayColor(segment, index, dark, highContrastEnabled);
            return highContrastEnabled ? createHatchPattern(chartContext, color, index) : color;
          });
          chartInstance.options.layout = {
            ...chartInstance.options.layout,
            padding: highContrastEnabled
              ? { top: 14, right: 92, bottom: 14, left: 92 }
              : 0,
          };
          const dataset = chartInstance.data.datasets[0];
          if (dataset) {
            dataset.hoverBorderColor = highContrastEnabled ? "#fff" : surface;
            dataset.hoverBorderWidth = 3;
          }
          const tooltip = chartInstance.options.plugins?.tooltip;
          if (tooltip) {
            tooltip.backgroundColor = updatedTooltipColors.backgroundColor;
            tooltip.titleColor = updatedTooltipColors.foregroundColor;
            tooltip.bodyColor = updatedTooltipColors.foregroundColor;
          }
          chartInstance.options.animation = { duration: 250 * getMotionFactor() };
          chartInstance.update("none");
        });
        themeObserver.observe(root, { attributes: true, attributeFilter: ["data-a11y-theme", "data-a11y-contrast", "data-a11y-motion"] });
        setChartLoadStatus('success');
      } catch {
        if (!disposed) setChartLoadStatus('error');
      }
    };

    if (typeof IntersectionObserver === 'undefined') {
      void initializeChart();
    } else {
      intersectionObserver = new IntersectionObserver((entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        intersectionObserver?.disconnect();
        void initializeChart();
      }, { rootMargin: '200px' });
      intersectionObserver.observe(canvas);
    }

    return () => {
      disposed = true;
      intersectionObserver?.disconnect();
      themeObserver?.disconnect();
      chart?.destroy();
      chartRef.current = null;
    };
  }, [segments, valueLabel]);

  const activateSegment = (index: number) => {
    setActiveIndex(index);
    const chart = chartRef.current;
    const arc = chart?.getDatasetMeta(0).data[index];
    if (!chart || !arc) {
      return;
    }

    const activeElement = { datasetIndex: 0, index };
    chart.setActiveElements([activeElement]);
    chart.tooltip?.setActiveElements([activeElement], { x: arc.x, y: arc.y });
    chart.update('none');
  };

  const clearActiveSegment = () => {
    setActiveIndex(null);
    const chart = chartRef.current;
    if (!chart) {
      return;
    }

    chart.setActiveElements([]);
    chart.tooltip?.setActiveElements([], { x: 0, y: 0 });
    chart.canvas.style.cursor = 'default';
    chart.update('none');
  };

  const handleSegmentMouseLeave = (event: MouseEvent<HTMLButtonElement>) => {
    if (document.activeElement !== event.currentTarget) {
      clearActiveSegment();
    }
  };

  return (
    <section className={styles.card} aria-labelledby={titleId} aria-describedby={descriptionId}>
      <header className={styles.heading}>
        <h2 id={titleId}>{title}</h2>
        <p id={descriptionId}>{description}</p>
      </header>
      <div className={styles.chartArea}>
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`${title}. ${segments.map((segment) => `${segment.label}: ${segment.value} ${valueLabel}`).join('; ')}`}
        />
        <div className={styles.centerValue} aria-hidden="true">
          <strong>{activeSegment ? activeSegment.value : total}</strong>
          <span>{activeSegment ? activeSegment.label : centerLabel}</span>
        </div>
      </div>
      {showChartLoading && (
        <p className={styles.srOnly} role="status">Carregando gráfico.</p>
      )}
      {!showChartLoading && chartLoadStatus === 'success' && (
        <p className={styles.srOnly} role="status">Gráfico carregado.</p>
      )}
      {!showChartLoading && chartLoadStatus === 'error' && (
        <p className={styles.chartError} role="alert">
          Não foi possível carregar o gráfico. Os dados permanecem disponíveis na lista abaixo.
        </p>
      )}
      <ul className={styles.legend} aria-label={`Dados de ${title}`}>
        {segments.map((segment, index) => (
          <li key={segment.id}>
            <button
              className={styles.segmentButton}
              type="button"
              onFocus={() => activateSegment(index)}
              onBlur={clearActiveSegment}
              onClick={() => activateSegment(index)}
              onMouseEnter={() => activateSegment(index)}
              onMouseLeave={handleSegmentMouseLeave}
            >
              <span className={styles.segmentName}>
                <span
                  className={styles.swatch}
                  style={{ "--segment-color": getSegmentDisplayColor(segment, index, darkTheme, highContrast) } as CSSProperties}
                  aria-hidden="true"
                />
                {segment.label}
              </span>
              <strong>{segment.value}</strong>
            </button>
          </li>
        ))}
      </ul>
      {note && <p className={styles.note}>{note}</p>}
    </section>
  );
}

export default DonutChart;
