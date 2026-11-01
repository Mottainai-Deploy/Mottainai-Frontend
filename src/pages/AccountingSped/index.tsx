import DropdownSelect from '@/components/DropdownSelect';
import JargonTooltip from '@/components/JargonTooltip';
import { type FormEvent, useCallback, useEffect, useId, useMemo, useState } from 'react';
import { cashClosingDiscrepancies, stockStores } from '@/data/stock';
import DetailsModal from '@/components/DetailsModal';
import type { DetailsModalField, OpenDetailsDialog } from '@/types/details-modal.types';
import type {
  MonthlyFinancialReport,
  MonthlyFinancialReportPageState,
} from '@/types/monthly-financial-report.types';
import type { ManagementReportFormat } from '@/types/management-report.types';
import {
  getMonthlyFinancialReports,
  saveMonthlyFinancialReport,
} from '@/services/monthlyFinancialReportService';
import {
  getManagementReportPreferences,
  saveManagementReportPreference,
} from '@/services/managementReportPreferencesService';
import { useMinimumLoadingVisibility } from '@/hooks/useMinimumLoadingVisibility';
import {
  buildMonthlyFinancialReportItems,
  createMonthlyFinancialReport,
  downloadMonthlyFinancialReport,
} from '@/utils/monthlyFinancialReports';
import { sanitizeMonthlyFinancialReportFilters, validateMonthlyFinancialReportFilters } from '@/utils/monthlyFinancialReportValidation';
import styles from './style.module.css';

const initialState: MonthlyFinancialReportPageState = {
  month: '',
  store: '__all__',
  format: 'csv',
  isSavingPreference: false,
  validationErrors: {},
  reports: [],
  selectedReport: null,
  isLoadingReports: true,
  isGenerating: false,
  feedback: '',
  error: '',
};

const availableMonths = Array.from(new Set(
  cashClosingDiscrepancies.map((record) => record.date.split('/')[1]),
)).filter((month): month is string => Boolean(month));

const monthNames = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});
const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

function AccountingSped() {
  const monthId = useId();
  const storeId = useId();
  const formatId = useId();
  const [state, setState] = useState<MonthlyFinancialReportPageState>(initialState);
  const minimumReportsLoadingVisible = useMinimumLoadingVisibility(state.isLoadingReports);
  const minimumPreferenceSavingVisible = useMinimumLoadingVisibility(state.isSavingPreference);
  const minimumReportGeneratingVisible = useMinimumLoadingVisibility(state.isGenerating);
  const showReportsLoading = state.isLoadingReports || minimumReportsLoadingVisible;
  const showPreferenceSaving = state.isSavingPreference || minimumPreferenceSavingVisible;
  const showReportGenerating = state.isGenerating || minimumReportGeneratingVisible;
  const hasVisibleLoading = showReportsLoading || showPreferenceSaving || showReportGenerating;
  const displayedFeedback = showReportsLoading
    ? ''
    : showPreferenceSaving
      ? 'Salvando preferência de formato…'
      : showReportGenerating
        ? 'Gerando e salvando relatório financeiro…'
        : state.feedback;
  const [detailsDialog, setDetailsDialog] =
    useState<OpenDetailsDialog<MonthlyFinancialReport> | null>(null);
  const handleCloseDetails = useCallback(() => setDetailsDialog(null), []);
  const items = useMemo(
    () => state.month
      ? buildMonthlyFinancialReportItems(cashClosingDiscrepancies, {
          month: state.month,
          store: state.store,
        })
      : [],
    [state.month, state.store],
  );
  const valueTotalInCents = items.reduce((total, item) => total + item.differenceValueInCents, 0);
  const detailsFields: DetailsModalField[] = detailsDialog
    ? [
        { id: 'createdAt', label: 'Gerado em', value: dateFormatter.format(new Date(detailsDialog.record.createdAt)) },
        { id: 'month', label: 'Mês de referência', value: `${detailsDialog.record.monthLabel} — ano não informado` },
        { id: 'store', label: 'Loja', value: detailsDialog.record.filters.store === '__all__' ? 'Todas as lojas' : detailsDialog.record.filters.store },
        { id: 'count', label: 'Registros de divergência', value: detailsDialog.record.items.length.toLocaleString('pt-BR') },
        { id: 'total', label: 'Soma dos valores cadastrados', value: currencyFormatter.format(detailsDialog.record.items.reduce((total, item) => total + item.differenceValueInCents, 0) / 100) },
      ]
    : [];

  useEffect(() => {
    let isMounted = true;
    const loadPageData = async () => {
      const [reportsResult, preferenceResult] = await Promise.allSettled([
        getMonthlyFinancialReports(),
        getManagementReportPreferences(),
      ]);
      if (!isMounted) return;

      setState((current) => ({
        ...current,
        reports: reportsResult.status === 'fulfilled' ? reportsResult.value : current.reports,
        isLoadingReports: false,
        feedback: reportsResult.status === 'fulfilled' ? 'Relatórios financeiros salvos carregados.' : '',
        error: reportsResult.status === 'rejected'
          ? reportsResult.reason instanceof Error
            ? reportsResult.reason.message
            : 'Não foi possível carregar os relatórios financeiros.'
          : preferenceResult.status === 'rejected'
            ? preferenceResult.reason instanceof Error
              ? preferenceResult.reason.message
              : 'Não foi possível carregar a preferência de formato.'
            : '',
      }));
      if (preferenceResult.status === 'fulfilled') {
        setState((current) => ({ ...current, format: preferenceResult.value.format }));
      }
    };

    void loadPageData();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleFormatChange = async (nextFormat: ManagementReportFormat) => {
    setState((current) => ({ ...current, format: nextFormat, isSavingPreference: true, feedback: 'Salvando preferência de formato…', error: '' }));
    try {
      await saveManagementReportPreference(nextFormat);
      setState((current) => ({ ...current, isSavingPreference: false, feedback: 'Formato salvo para as próximas visitas.', error: '' }));
    } catch (error) {
      setState((current) => ({
        ...current,
        isSavingPreference: false,
        feedback: '',
        error: error instanceof Error ? error.message : 'Não foi possível salvar a preferência de formato.',
      }));
    }
  };

  const exportReport = (report: MonthlyFinancialReport) => {
    if (state.format === 'csv') {
      downloadMonthlyFinancialReport(report);
      setState((current) => ({ ...current, feedback: 'Relatório exportado em CSV.', error: '' }));
      return;
    }
    setState((current) => ({ ...current, selectedReport: report, feedback: 'Na janela de impressão, escolha “Salvar como PDF”.', error: '' }));
    window.requestAnimationFrame(() => window.print());
  };

  const handleGenerate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const filters = sanitizeMonthlyFinancialReportFilters({ month: state.month, store: state.store });
    const validationErrors = validateMonthlyFinancialReportFilters(filters);
    if (Object.keys(validationErrors).length > 0) {
      setState((current) => ({
        ...current,
        validationErrors,
        feedback: '',
        error: Object.values(validationErrors)[0] ?? 'Revise os filtros do relatório.',
      }));
      document.getElementById(validationErrors.month ? monthId : storeId)?.focus();
      return;
    }
    if (items.length === 0) {
      setState((current) => ({ ...current, feedback: '', error: 'Não há divergências registradas para o mês e a loja selecionados.' }));
      return;
    }

    const report = createMonthlyFinancialReport(filters, items);
    setState((current) => ({ ...current, isGenerating: true, feedback: 'Gerando e salvando relatório financeiro…', error: '' }));
    try {
      await saveMonthlyFinancialReport(report);
      setState((current) => ({
        ...current,
        reports: [report, ...current.reports.filter((savedReport) => savedReport.id !== report.id)],
        selectedReport: report,
        isGenerating: false,
        feedback: 'Relatório financeiro gerado e salvo neste navegador.',
        error: '',
      }));
      exportReport(report);
    } catch (error) {
      setState((current) => ({
        ...current,
        isGenerating: false,
        feedback: '',
        error: error instanceof Error ? error.message : 'Não foi possível salvar o relatório financeiro.',
      }));
    }
  };

  return (
    <section className={styles.page} aria-labelledby="accounting-sped-title">
      <header>
        <p className={styles.eyebrow}>Contabilidade/<JargonTooltip term="SPED" explanation="Sistema Público de Escrituração Digital, usado para enviar informações fiscais e contábeis em formato digital." /></p>
        <h1 id="accounting-sped-title">Relatório financeiro mensal</h1>
        <p className={styles.intro}>Exporte as divergências de caixa registradas no mês selecionado.</p>
      </header>

      <section className={styles.card} aria-labelledby="monthly-report-form-title">
        <h2 id="monthly-report-form-title">Gerar relatório do mês</h2>
        <form onSubmit={handleGenerate}>
          <div className={styles.filters}>
            <div className={styles.field}>
              <label htmlFor={monthId}>Mês de referência</label>
              <DropdownSelect
                id={monthId}
                required
                value={state.month}
              ariaInvalid={Boolean(state.validationErrors.month)}
              ariaDescribedBy={state.validationErrors.month ? `${monthId}-error` : undefined}
              onChange={(event) => setState((current) => ({
                  ...current,
                  month: event.target.value,
                validationErrors: { ...current.validationErrors, month: undefined },
                  selectedReport: null,
                  feedback: '',
                  error: '',
                }))}
              >
                <option value="" disabled>Selecione um mês disponível</option>
                {availableMonths.map((month) => (
                  <option key={month} value={month}>
                    {monthNames[Number(month) - 1] ?? `Mês ${month}`} — amostra; ano não informado
                  </option>
                ))}
              </DropdownSelect>
              {state.validationErrors.month && <p className={styles.fieldError} id={`${monthId}-error`} role="alert">{state.validationErrors.month}</p>}
            </div>
            <div className={styles.field}>
              <label htmlFor={storeId}>Loja</label>
              <DropdownSelect
                id={storeId}
                value={state.store}
                ariaInvalid={Boolean(state.validationErrors.store)}
                ariaDescribedBy={state.validationErrors.store ? `${storeId}-error` : undefined}
                onChange={(event) => setState((current) => ({
                  ...current,
                  store: event.target.value,
                  validationErrors: { ...current.validationErrors, store: undefined },
                  selectedReport: null,
                  feedback: '',
                  error: '',
                }))}
              >
                <option value="__all__">Todas as lojas</option>
                {stockStores.map((store) => <option key={store} value={store}>{store}</option>)}
              </DropdownSelect>
              {state.validationErrors.store && <p className={styles.fieldError} id={`${storeId}-error`} role="alert">{state.validationErrors.store}</p>}
            </div>
          </div>

          <fieldset className={styles.formatPicker} disabled={state.isLoadingReports || state.isGenerating || state.isSavingPreference || showReportsLoading || showReportGenerating || showPreferenceSaving}>
            <legend>Formato de exportação</legend>
            <div className={styles.formatOptions}>
              <label className={state.format === 'pdf' ? styles.formatSelected : styles.formatOption} htmlFor={`${formatId}-pdf`}>
                <input id={`${formatId}-pdf`} type="radio" name="monthly-financial-format" value="pdf" checked={state.format === 'pdf'} onChange={() => void handleFormatChange('pdf')} />
                PDF
              </label>
              <label className={state.format === 'csv' ? styles.formatSelected : styles.formatOption} htmlFor={`${formatId}-csv`}>
                <input id={`${formatId}-csv`} type="radio" name="monthly-financial-format" value="csv" checked={state.format === 'csv'} onChange={() => void handleFormatChange('csv')} />
                CSV
              </label>
            </div>
          </fieldset>
          <div className={styles.actions}>
            <button type="submit" className={styles.primaryButton} disabled={state.isLoadingReports || state.isGenerating || state.isSavingPreference || showReportsLoading || showReportGenerating || showPreferenceSaving}>
              {showReportGenerating ? 'Gerando…' : `Gerar e exportar ${state.format.toUpperCase()}`}
            </button>
          </div>
        </form>

        <p className={styles.helper}>
          {items.length.toLocaleString('pt-BR')} divergências no recorte. A soma dos valores cadastrados é apresentada sem classificá-la como lucro ou prejuízo.
        </p>
        {displayedFeedback && <p className={styles.success} role="status">{displayedFeedback}</p>}
        {!hasVisibleLoading && state.error && <p className={styles.error} role="alert">{state.error}</p>}

        {items.length > 0 && (
          <>
            <dl className={styles.summary}>
              <div><dt>Registros de divergência</dt><dd>{items.length.toLocaleString('pt-BR')}</dd></div>
              <div><dt>Soma dos valores cadastrados</dt><dd>{currencyFormatter.format(valueTotalInCents / 100)}</dd></div>
            </dl>
            <div className={styles.tableWrap}>
              <table>
                <caption className={styles.srOnly}>Divergências de caixa incluídas no relatório mensal</caption>
                <thead><tr><th scope="col">Data</th><th scope="col">Loja</th><th scope="col">Item</th><th scope="col">Diferença (un.)</th><th scope="col">Valor registrado</th><th scope="col">Status</th></tr></thead>
                <tbody>{items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.date}</td><td>{item.store}</td><th scope="row">{item.item}</th>
                    <td>{item.quantityDifference.toLocaleString('pt-BR')}</td><td>{currencyFormatter.format(item.differenceValueInCents / 100)}</td><td>{item.status}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <section className={styles.card} aria-labelledby="saved-financial-reports-title">
        <h2 id="saved-financial-reports-title">Relatórios financeiros salvos neste navegador</h2>
        <p>Os relatórios ficam armazenados por até um ano.</p>
        {showReportsLoading && <p role="status">Carregando relatórios salvos…</p>}
        {!showReportsLoading && state.reports.length > 0 && (
          <div className={styles.tableWrap}>
            <table>
              <caption className={styles.srOnly}>Relatórios financeiros mensais salvos neste navegador</caption>
              <thead><tr><th scope="col">Gerado em</th><th scope="col">Mês</th><th scope="col">Loja</th><th scope="col">Registros</th><th scope="col">Ações</th></tr></thead>
              <tbody>{state.reports.map((report) => (
                <tr key={report.id}>
                  <td>{dateFormatter.format(new Date(report.createdAt))}</td>
                  <th scope="row">{report.monthLabel} — ano não informado</th>
                  <td>{report.filters.store === '__all__' ? 'Todas as lojas' : report.filters.store}</td>
                  <td>{report.items.length}</td>
                  <td>
                    <div className={styles.reportActions}>
                      <button
                        type="button"
                        className={`${styles.viewButton} table-action-transition`}
                        aria-label={`Ver relatório financeiro de ${report.monthLabel}`}
                        aria-haspopup="dialog"
                        onClick={(event) => setDetailsDialog({ record: report, trigger: event.currentTarget })}
                      >
                        Ver
                      </button>
                      <button type="button" className={styles.downloadButton} onClick={() => exportReport(report)}>
                        Exportar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        {!showReportsLoading && state.reports.length === 0 && <p className={styles.emptyState}>Nenhum relatório financeiro foi salvo ainda.</p>}
      </section>

      <section className={styles.printArea} aria-label="Relatório financeiro para impressão">
        {state.selectedReport && (
          <>
            <h1>Relatório financeiro mensal — divergências de caixa</h1>
            <p>Gerado em {dateFormatter.format(new Date(state.selectedReport.createdAt))}</p>
            <p>Período: {state.selectedReport.monthLabel} — ano não informado</p>
            <p>Loja: {state.selectedReport.filters.store === '__all__' ? 'Todas as lojas' : state.selectedReport.filters.store}</p>
            <p className={styles.limitation}>Amostra demonstrativa com registros em 17/05, sem ano informado. Não há lançamentos de receitas ou despesas; esta lista não representa o fechamento financeiro completo do mês.</p>
            <p><strong>Registros:</strong> {state.selectedReport.items.length.toLocaleString('pt-BR')}</p>
            <p><strong>Soma dos valores cadastrados:</strong> {currencyFormatter.format(state.selectedReport.items.reduce((total, item) => total + item.differenceValueInCents, 0) / 100)}</p>
            <table>
              <caption className={styles.srOnly}>Detalhamento de divergências de caixa</caption>
              <thead><tr><th scope="col">Data</th><th scope="col">Loja</th><th scope="col">Categoria</th><th scope="col">Item</th><th scope="col">Diferença (un.)</th><th scope="col">Valor da divergência</th><th scope="col">Status</th></tr></thead>
              <tbody>{state.selectedReport.items.map((item) => (
                <tr key={item.id}><td>{item.date}</td><td>{item.store}</td><td>{item.category}</td><th scope="row">{item.item}</th><td>{item.quantityDifference}</td><td>{currencyFormatter.format(item.differenceValueInCents / 100)}</td><td>{item.status}</td></tr>
              ))}</tbody>
            </table>
          </>
        )}
      </section>
      {detailsDialog && (
        <DetailsModal
          title="Relatório financeiro mensal"
          description="Confira os registros que foram salvos neste relatório. O ano não é informado na amostra de dados."
          fields={detailsFields}
          triggerElement={detailsDialog.trigger}
          onClose={handleCloseDetails}
        >
          <h3>Divergências incluídas</h3>
          <div className={styles.tableWrap}>
            <table>
              <caption className={styles.srOnly}>Divergências incluídas no relatório financeiro salvo</caption>
              <thead>
                <tr>
                  <th scope="col">Data</th><th scope="col">Loja</th><th scope="col">Categoria</th>
                  <th scope="col">Item</th><th scope="col">Diferença (un.)</th>
                  <th scope="col">Valor registrado</th><th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {detailsDialog.record.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.date}</td><td>{item.store}</td><td>{item.category}</td>
                    <th scope="row">{item.item}</th>
                    <td>{item.quantityDifference.toLocaleString('pt-BR')}</td>
                    <td>{currencyFormatter.format(item.differenceValueInCents / 100)}</td>
                    <td>{item.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DetailsModal>
      )}
    </section>
  );
}

export default AccountingSped;
