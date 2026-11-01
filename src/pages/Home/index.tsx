import { useEffect, useMemo, useState } from 'react';
import DonutChart from '@/components/DonutChart';
import InfoCard from "@/components/InfoCard"
import HistoricalChart from '@/components/HistoricalChart';
import Ranking from '@/components/Ranking';
import JargonTooltip from '@/components/JargonTooltip';
import { products } from '@/data/products';
import { wastedItemsByCategory } from '@/data/wastedItemsByCategory';
import { useHistoricalMetrics } from '@/hooks/useHistoricalMetrics';
import { useRanking } from '@/hooks/useRanking';
import { useMinimumLoadingVisibility } from '@/hooks/useMinimumLoadingVisibility';
import { summarizeProductCriticality } from '@/utils/criticalitySummary';
import type { DonutChartSegment } from '@/types/donut-chart.types';
import type { HistoricalMetric } from '@/types/historical-metric.types';
import type { ProductTrafficLight } from '@/types/product.types';
import styles from './style.module.css'

const criticalitySummary = summarizeProductCriticality(products);
const criticalityChartColors: Record<ProductTrafficLight, string> = {
    regular: '#0f766e',
    attention: '#a15c00',
    critical: '#b4232d',
};
const criticalityDonutSegments: DonutChartSegment[] = criticalitySummary.map((item) => ({
    id: item.id,
    label: item.status,
    value: item.quantity,
    color: criticalityChartColors[item.id],
}));
const criticalityStatusClasses = {
    regular: styles.moderate,
    attention: styles.high,
    critical: styles.critical,
} as const;
const orderedCriticalitySummary = [...criticalitySummary].reverse();
const weeklySalesValues = [64, 68, 72, 76, 91, 118, 83, 86];
const shortDateFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' });
// Keyboard focus lets users scroll the table horizontally without a pointer.
const keyboardScrollProps = { tabIndex: 0 } as const;

function toLocalDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

const formatShortDate = (date: Date) => shortDateFormatter.format(date);

function Home(){
    const [currentDate, setCurrentDate] = useState(() => new Date());
    const { data, isLoading, error } = useHistoricalMetrics();
    const { data: rankingData, isLoading: isRankingLoading, error: rankingError } = useRanking();
    const minimumHistoricalLoadingVisible = useMinimumLoadingVisibility(isLoading);
    const minimumRankingLoadingVisible = useMinimumLoadingVisibility(isRankingLoading);
    const showHistoricalLoading = isLoading || minimumHistoricalLoadingVisible;
    const showRankingLoading = isRankingLoading || minimumRankingLoadingVisible;

    useEffect(() => {
        const nextMidnight = new Date(currentDate);
        nextMidnight.setHours(24, 0, 0, 0);
        const timeoutId = window.setTimeout(
            () => setCurrentDate(new Date()),
            Math.max(nextMidnight.getTime() - Date.now(), 1000),
        );

        return () => window.clearTimeout(timeoutId);
    }, [currentDate]);

    const { periodEnd, periodStart, periodLabel, weeklySalesData } = useMemo(() => {
        const periodEnd = new Date(currentDate);
        periodEnd.setDate(currentDate.getDate() - 1);
        const periodStart = new Date(periodEnd);
        periodStart.setDate(periodEnd.getDate() - 7);
        const weeklySalesData: HistoricalMetric[] = weeklySalesValues.map((value, index) => {
            const date = new Date(periodStart);
            date.setDate(periodStart.getDate() + index);
            return { date: toLocalDateString(date), value };
        });

        return {
            periodEnd,
            periodStart,
            periodLabel: `${formatShortDate(periodStart)}–${formatShortDate(periodEnd)}`,
            weeklySalesData,
        };
    }, [currentDate]);

    return(
        <>
            <h1 className={styles.title}>Métricas principais</h1>
            {/* cards */}
            <div className={styles['container-card']}>
                <InfoCard title="Vendas deste mês" value="R$100.00" footer="vendeu 10% a mais do que mês passado" tone="success"/>
                <InfoCard title="Desempenho desse mês" value="23%" footer="Continue aceitando as decisões do motor!" tone="success"/>
                <InfoCard title="Vendas de ontem" value="R$20.845" footer="A menor dessa semana" tone="danger"/>
                <InfoCard title="Ações Críticas" value="100" footer="Veja as ações para ter melhor desempenho" tone="warning"/>
            </div>
            <section className={styles.seasonality} aria-label="Sazonalidade das vendas">
                <HistoricalChart
                    data={weeklySalesData}
                    title="Sazonalidade das vendas"
                    description="Volume diário de sete dias atrás até ontem, incluindo as duas datas."
                    period={periodLabel}
                    datasetLabel="Vendas (demonstração)"
                    ariaLabel={`Gráfico de linha da sazonalidade de vendas entre ${periodLabel}`}
                    beginAtZero
                />
                <dl className={styles.comparison}>
                    <div>
                        <dt>Mesmo dia da semana passada ({formatShortDate(periodStart)})</dt>
                        <dd>{weeklySalesValues[0]} vendas <span>(demonstração)</span></dd>
                    </div>
                    <div>
                        <dt>Ontem ({formatShortDate(periodEnd)})</dt>
                        <dd>{weeklySalesValues[weeklySalesValues.length - 1]} vendas <span>(demonstração)</span></dd>
                    </div>
                </dl>
                <p className={styles.dataNote}>A comparação usa ontem e a data equivalente da semana anterior. Os valores são demonstrativos; o projeto ainda não possui uma fonte de vendas reais por data.</p>
            </section>
            <div className={styles['container']}>

                {/* grafico */}
                {showHistoricalLoading && <p className={styles.feedback} role="status">Carregando histórico...</p>}
                {!showHistoricalLoading && error && <p className={styles.feedback} role="alert">{error}</p>}
                {!showHistoricalLoading && !error && <HistoricalChart data={data} />}

                {/* ranking */}
                {showRankingLoading && <p className={styles.feedback} role="status">Carregando ranking...</p>}
                {!showRankingLoading && rankingError && <p className={styles.feedback} role="alert">{rankingError}</p>}
                {!showRankingLoading && !rankingError && (
                    <Ranking
                        data={rankingData}
                        title="Top 5 produtos que mais saíram"
                        itemLabel="Produto"
                        valueLabel="Unidades vendidas"
                        valueFormat="decimal"
                        valueSuffix=" un"
                        maxItems={5}
                    />
                )}
            </div>
            <section className={styles.criticalityCard} aria-labelledby="criticality-title">
                <h2 id="criticality-title">Nível de <JargonTooltip term="criticidade" explanation="Grau de atenção necessário para um produto, conforme os critérios do sistema." /> – <JargonTooltip term="SKUs" explanation="Códigos únicos usados para identificar cada produto no estoque." /> monitorados</h2>
                <div
                    className={styles.criticalityTableRegion}
                    role="region"
                    aria-labelledby="criticality-title"
                    {...keyboardScrollProps}
                >
                    <table className={styles.criticalityTable}>
                        <caption className={styles.visuallyHidden}>
                            Quantidade de SKUs em cada nível e faixa de ação correspondente.
                        </caption>
                        <thead>
                            <tr>
                                <th scope="col">Status</th>
                                <th scope="col">Quantidade</th>
                                <th scope="col">Faixa</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orderedCriticalitySummary.map((item) => (
                                <tr key={item.id}>
                                    <th scope="row">
                                            <span
                                                className={`${styles.criticalityStatus} ${criticalityStatusClasses[item.id]}`}
                                                data-a11y-light-surface="true"
                                            >
                                            {item.status}
                                        </span>
                                    </th>
                                    <td>{item.quantity.toLocaleString('pt-BR')}</td>
                                    <td>{item.guidance}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
            <section className={styles.donutGrid} aria-label="Gráficos de criticidade e desperdício">
                <DonutChart
                    title="Nível de criticidade – SKUs monitorados"
                    description="Distribuição dos produtos monitorados entre os níveis Crítico, Alto e Moderado."
                    segments={criticalityDonutSegments}
                    centerLabel="SKUs"
                    valueLabel="SKUs"
                />
                <DonutChart
                    title="Categoria x quantidade de itens desperdiçados"
                    description="Quantidade demonstrativa de itens descartados em cada categoria."
                    segments={wastedItemsByCategory}
                    centerLabel="itens"
                    valueLabel="itens desperdiçados"
                    note="Dados demonstrativos: o projeto ainda não registra itens descartados por categoria."
                />
            </section>
        </>
    )
}

export default Home
