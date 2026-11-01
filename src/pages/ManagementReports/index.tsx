import DropdownSelect from '@/components/DropdownSelect';
import { type FormEvent, useCallback, useEffect, useId, useMemo, useState } from 'react';
import { cashClosingDiscrepancies, stockStores } from '@/data/stock';
import DetailsModal from '@/components/DetailsModal';
import type { DetailsModalField, OpenDetailsDialog } from '@/types/details-modal.types';
import type {
  ManagementReport,
  ManagementReportFormat,
  ManagementReportPageState,
} from '@/types/management-report.types';
import { sanitizeManagementReportFilters, validateManagementReportFilters } from '@/utils/managementReportValidation';
import {
  buildTopSellingReport,
  createManagementReport,
  downloadManagementReport,
} from '@/utils/managementReports';
import { getManagementReports, saveManagementReport } from '@/services/managementReportService';
import {
  getManagementReportPreferences,
  saveManagementReportPreference,
} from '@/services/managementReportPreferencesService';
import { useMinimumLoadingVisibility } from '@/hooks/useMinimumLoadingVisibility';
import styles from './style.module.css';

const initialState: ManagementReportPageState = {
  filters: { date: '', store: '', category: '' },
  filterErrors: {},
  reports: [],
  selectedReport: null,
  format: 'csv',
  isLoadingReports: true,
  isSavingPreference: false,
  isSavingReport: false,
  feedback: '',
  error: '',
};

const availableDates = Array.from(
  new Set(cashClosingDiscrepancies.map((record) => record.date)),
);
const categories = Array.from(
  new Set(cashClosingDiscrepancies.map((record) => record.scope)),
);

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

// Focusable table wrappers let keyboard users scroll horizontally without a pointer.
const keyboardScrollProps = { tabIndex: 0 } as const;

function ManagementReports() {
  const dateId = useId();
  const storeId = useId();
  const categoryId = useId();
  const formatId = useId();
  const [state, setState] = useState<ManagementReportPageState>(initialState);
  const minimumReportsLoadingVisible = useMinimumLoadingVisibility(state.isLoadingReports);
  const minimumPreferenceSavingVisible = useMinimumLoadingVisibility(state.isSavingPreference);
  const minimumReportSavingVisible = useMinimumLoadingVisibility(state.isSavingReport);
  const showReportsLoading = state.isLoadingReports || minimumReportsLoadingVisible;
  const showPreferenceSaving = state.isSavingPreference || minimumPreferenceSavingVisible;
  const showReportSaving = state.isSavingReport || minimumReportSavingVisible;
  const hasVisibleLoading = showReportsLoading || showPreferenceSaving || showReportSaving;
  const displayedFeedback = showReportsLoading
    ? ''
    : showPreferenceSaving
      ? 'Salvando preferência de formato…'
      : showReportSaving
        ? 'Exportando e salvando relatório neste navegador…'
        : state.feedback;
  const [detailsDialog, setDetailsDialog] =
    useState<OpenDetailsDialog<ManagementReport> | null>(null);
  const handleCloseDetails = useCallback(() => setDetailsDialog(null), []);
  const previewItems = useMemo(
    () => buildTopSellingReport(cashClosingDiscrepancies, state.filters),
    [state.filters],
  );

  useEffect(() => {
    let isMounted = true;

    const loadReports = async () => {
      const [reportsResult, preferencesResult] = await Promise.allSettled([
        getManagementReports(),
        getManagementReportPreferences(),
      ]);
      if (!isMounted) return;

      setState((current) => {
        const errors: string[] = [];
        if (reportsResult.status === 'rejected') {
          errors.push(reportsResult.reason instanceof Error
            ? reportsResult.reason.message
            : 'Erro ao carregar relatórios salvos.');
        }
        if (preferencesResult.status === 'rejected') {
          errors.push(preferencesResult.reason instanceof Error
            ? preferencesResult.reason.message
            : 'Erro ao carregar a preferência de formato.');
        }

        return {
          ...current,
          reports: reportsResult.status === 'fulfilled' ? reportsResult.value : current.reports,
          format: preferencesResult.status === 'fulfilled' ? preferencesResult.value.format : current.format,
          isLoadingReports: false,
          feedback: reportsResult.status === 'fulfilled' ? 'Relatórios salvos carregados.' : '',
          error: errors.join(' '),
        };
      });
    };

    void loadReports();
    return () => {
      isMounted = false;
    };
  }, []);

  const updateFilter = (field: 'date' | 'store' | 'category', value: string) => {
    setState((current) => ({
      ...current,
      filters: { ...current.filters, [field]: value },
      filterErrors: { ...current.filterErrors, [field]: undefined },
      selectedReport: null,
      feedback: '',
      error: '',
    }));
  };

  const handleFormatChange = async (format: ManagementReportFormat) => {
    setState((current) => ({
      ...current,
      format,
      isSavingPreference: true,
      feedback: 'Salvando preferência de formato…',
      error: '',
    }));

    try {
      await saveManagementReportPreference(format);
      setState((current) => ({
        ...current,
        isSavingPreference: false,
        feedback: 'Formato salvo para as próximas visitas.',
        error: '',
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        isSavingPreference: false,
        feedback: '',
        error: error instanceof Error
          ? error.message
          : 'Não foi possível salvar a preferência de formato neste navegador.',
      }));
    }
  };

  const handleExport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedReport) {
      const filterErrors = validateManagementReportFilters(state.filters);
      if (Object.keys(filterErrors).length > 0) {
        setState((current) => ({
          ...current,
          filterErrors,
          feedback: '',
          error: Object.values(filterErrors)[0] ?? 'Revise os filtros do relatório.',
        }));
        const firstInvalidId = filterErrors.date ? dateId : filterErrors.store ? storeId : categoryId;
        document.getElementById(firstInvalidId)?.focus();
        return;
      }

      if (previewItems.length === 0) {
        setState((current) => ({
          ...current,
          feedback: '',
          error: 'Não há registros para os filtros selecionados.',
        }));
        return;
      }
    }

    const report = selectedReport ?? createManagementReport(sanitizeManagementReportFilters(state.filters), previewItems);
    const isAlreadyListed = state.reports.some((item) => item.id === report.id);
    setState((current) => ({
      ...current,
      isSavingReport: true,
      feedback: 'Exportando e salvando relatório neste navegador…',
      error: '',
    }));

    let wasExported = false;
    try {
      if (state.format === 'csv') {
        downloadManagementReport(report);
      } else {
        window.print();
      }
      wasExported = true;
      await saveManagementReport(report);
      setState((current) => ({
        ...current,
        reports: isAlreadyListed
          ? current.reports.map((item) => item.id === report.id ? report : item)
          : [report, ...current.reports],
        selectedReport: report,
        isSavingReport: false,
        feedback: state.format === 'csv'
          ? 'Relatório gerado, exportado em CSV e salvo neste navegador.'
          : 'Relatório gerado e salvo. Na janela de impressão, escolha “Salvar como PDF”.',
        error: '',
      }));
    } catch {
      setState((current) => ({
        ...current,
        isSavingReport: false,
        feedback: wasExported ? 'A exportação foi iniciada, mas não foi possível salvar uma cópia do relatório neste navegador.' : '',
        error: wasExported
          ? 'O armazenamento local falhou. Tente novamente ou exporte uma cópia do arquivo.'
          : 'Não foi possível exportar o relatório. Tente novamente.',
      }));
    }
  };

  const selectedReport = state.selectedReport;
  const detailsFields: DetailsModalField[] = detailsDialog
    ? [
        { id: 'createdAt', label: 'Gerado em', value: dateFormatter.format(new Date(detailsDialog.record.createdAt)) },
        { id: 'period', label: 'Período', value: detailsDialog.record.filters.date === '__all__' ? 'Todos os registros' : detailsDialog.record.filters.date },
        { id: 'store', label: 'Loja', value: detailsDialog.record.filters.store === '__all__' ? 'Todas as lojas' : detailsDialog.record.filters.store },
        { id: 'category', label: 'Categoria', value: detailsDialog.record.filters.category === '__all__' ? 'Todas as categorias' : detailsDialog.record.filters.category },
        { id: 'itemCount', label: 'Produtos no relatório', value: detailsDialog.record.items.length.toLocaleString('pt-BR') },
        { id: 'units', label: 'Unidades vendidas', value: detailsDialog.record.items.reduce((total, item) => total + item.unitsSold, 0).toLocaleString('pt-BR') },
      ]
    : [];
  const printableReport: ManagementReport | null = selectedReport ?? (
    state.filters.date && state.filters.store && state.filters.category && previewItems.length > 0
      ? {
          id: 'current-report-preview',
          createdAt: new Date().toISOString(),
          filters: state.filters,
          items: previewItems,
        }
      : null
  );

  return (
    <section className={styles.page} aria-labelledby="management-reports-title">
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Contabilidade</p>
          <h1 id="management-reports-title">Relatórios e exportação</h1>
          <p className={styles.intro}>
            Gere e exporte relatórios a partir dos registros dos produtos disponíveis no sistema.
          </p>
        </div>
      </header>

      <section className={styles.card} aria-labelledby="generate-report-title">
        <div className={styles.cardHeader}>
          <div>
            <h2 id="generate-report-title">Gerar relatório</h2>
            <p>Selecione o recorte dos dados que deseja consultar.</p>
          </div>
        </div>

        <form onSubmit={handleExport}>
        <div className={styles.filters}>
          <div className={styles.field}>
            <label htmlFor={dateId}>Período de referência</label>
            <DropdownSelect
              id={dateId}
              required
              value={state.filters.date}
              ariaInvalid={Boolean(state.filterErrors.date)}
              ariaDescribedBy={state.filterErrors.date ? `${dateId}-error` : undefined}
              onChange={(event) => updateFilter('date', event.target.value)}
            >
              <option value="" disabled>Selecione um período</option>
              <option value="__all__">Todos os registros</option>
              {availableDates.map((date) => (
                <option key={date} value={date}>{date} (amostra)</option>
              ))}
            </DropdownSelect>
            {state.filterErrors.date && <p className={styles.fieldError} id={`${dateId}-error`} role="alert">{state.filterErrors.date}</p>}
          </div>

          <div className={styles.field}>
            <label htmlFor={storeId}>Loja</label>
            <DropdownSelect
              id={storeId}
              required
              value={state.filters.store}
              ariaInvalid={Boolean(state.filterErrors.store)}
              ariaDescribedBy={state.filterErrors.store ? `${storeId}-error` : undefined}
              onChange={(event) => updateFilter('store', event.target.value)}
            >
              <option value="" disabled>Selecione uma loja</option>
              <option value="__all__">Todas as lojas</option>
              {stockStores.map((store) => (
                <option key={store} value={store}>{store}</option>
              ))}
            </DropdownSelect>
            {state.filterErrors.store && <p className={styles.fieldError} id={`${storeId}-error`} role="alert">{state.filterErrors.store}</p>}
          </div>

          <div className={styles.field}>
            <label htmlFor={categoryId}>Categoria</label>
            <DropdownSelect
              id={categoryId}
              required
              value={state.filters.category}
              ariaInvalid={Boolean(state.filterErrors.category)}
              ariaDescribedBy={state.filterErrors.category ? `${categoryId}-error` : undefined}
              onChange={(event) => updateFilter('category', event.target.value)}
            >
              <option value="" disabled>Selecione uma categoria</option>
              <option value="__all__">Todas as categorias</option>
              {categories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </DropdownSelect>
            {state.filterErrors.category && <p className={styles.fieldError} id={`${categoryId}-error`} role="alert">{state.filterErrors.category}</p>}
          </div>
        </div>

        <fieldset
          className={styles.formatPicker}
          disabled={state.isLoadingReports || state.isSavingPreference || state.isSavingReport || showReportsLoading || showPreferenceSaving || showReportSaving}
        >
          <legend>Formato de exportação</legend>
          <div className={styles.formatOptions}>
            <label className={state.format === 'pdf' ? styles.formatSelected : styles.formatOption} htmlFor={`${formatId}-pdf`}>
              <input
                id={`${formatId}-pdf`}
                type="radio"
                name="report-format"
                value="pdf"
                checked={state.format === 'pdf'}
                onChange={() => handleFormatChange('pdf')}
              />
              PDF
            </label>
            <label className={state.format === 'csv' ? styles.formatSelected : styles.formatOption} htmlFor={`${formatId}-csv`}>
              <input
                id={`${formatId}-csv`}
                type="radio"
                name="report-format"
                value="csv"
                checked={state.format === 'csv'}
                onChange={() => handleFormatChange('csv')}
              />
              CSV
            </label>
          </div>
        </fieldset>

        <div className={styles.actions}>
          <button
            type="submit"
            className={styles.exportButton}
            formNoValidate={Boolean(selectedReport)}
            disabled={state.isLoadingReports || state.isSavingPreference || state.isSavingReport || showReportsLoading || showPreferenceSaving || showReportSaving}
          >
            {showReportSaving ? 'Salvando…' : `Exportar ${state.format.toUpperCase()}`}
          </button>
        </div>
        </form>
        {displayedFeedback && <p className={styles.success} role="status">{displayedFeedback}</p>}
        {!hasVisibleLoading && state.error && <p className={styles.error} role="alert">{state.error}</p>}
      </section>

      <section className={styles.card} aria-labelledby="report-results-title">
        <div className={styles.cardHeader}>
          <div>
            <h2 id="report-results-title">Prévia do relatório</h2>
            <p>{previewItems.length} produtos no recorte atual</p>
          </div>
          {selectedReport && <span className={styles.selectedLabel}>Último relatório gerado</span>}
        </div>
        {previewItems.length > 0 ? (
          <div
            className={styles.tableWrap}
            role="region"
            {...keyboardScrollProps}
            aria-label="Prévia dos produtos. Use as setas para rolar a tabela horizontalmente."
          >
            <table>
              <caption className={styles.srOnly}>Produtos mais vendidos no recorte selecionado</caption>
              <thead>
                <tr><th scope="col">Produto</th><th scope="col">Categoria</th><th scope="col">Unidades vendidas</th></tr>
              </thead>
              <tbody>
                {previewItems.map((item) => (
                  <tr key={item.id}>
                    <th scope="row">{item.product}</th>
                    <td>{item.category}</td>
                    <td>{item.unitsSold.toLocaleString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className={styles.emptyState}>Nenhum registro encontrado para esse recorte.</p>
        )}
      </section>

      <section className={styles.card} aria-labelledby="recent-reports-title">
        <div className={styles.cardHeader}>
          <div>
            <h2 id="recent-reports-title">Relatórios salvos neste navegador</h2>
            <p>Os relatórios ficam salvos neste navegador por até 1 ano.</p>
          </div>
        </div>
        {showReportsLoading && <p role="status">Carregando relatórios salvos…</p>}
        {!showReportsLoading && state.reports.length ? (
          <div
            className={styles.tableWrap}
            role="region"
            {...keyboardScrollProps}
            aria-label="Relatórios salvos. Use as setas para rolar a tabela horizontalmente."
          >
            <table>
              <caption className={styles.srOnly}>Relatórios salvos neste navegador</caption>
              <thead>
                <tr><th scope="col">Gerado em</th><th scope="col">Relatório</th><th scope="col">Data</th><th scope="col">Itens</th><th scope="col">Ações</th></tr>
              </thead>
              <tbody>
                {state.reports.map((report) => (
                  <tr key={report.id}>
                    <td>{dateFormatter.format(new Date(report.createdAt))}</td>
                    <th scope="row">Produtos mais vendidos</th>
                    <td>{report.filters.date === '__all__' ? 'Todos os registros' : report.filters.date}</td>
                    <td>{report.items.length}</td>
                    <td>
                      <div className={styles.reportActions}>
                        <button
                          type="button"
                          className={`${styles.viewButton} a11y-table-action table-action-transition`}
                          aria-label={`Ver relatório de produtos mais vendidos, gerado em ${dateFormatter.format(new Date(report.createdAt))}`}
                          aria-haspopup="dialog"
                          onClick={(event) => setDetailsDialog({ record: report, trigger: event.currentTarget })}
                        >
                          Ver
                        </button>
                        <button
                          type="button"
                          className={styles.downloadButton}
                          aria-pressed={selectedReport?.id === report.id}
                          onClick={() => setState((current) => ({
                            ...current,
                            selectedReport: report,
                            feedback: 'Relatório selecionado. Escolha PDF ou CSV para exportá-lo.',
                            error: '',
                          }))}
                        >
                          Selecionar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : !showReportsLoading ? (
          <p className={styles.emptyState}>Nenhum relatório foi salvo neste navegador ainda.</p>
        ) : null}
      </section>

      <section className={styles.printArea} aria-label="Relatório para impressão">
        {printableReport && (
          <>
            <h1>Produtos mais vendidos</h1>
            <p>Gerado em {dateFormatter.format(new Date(printableReport.createdAt))}</p>
            <p>Período: {printableReport.filters.date === '__all__' ? 'Todos os registros' : printableReport.filters.date}</p>
            <p>Loja: {printableReport.filters.store === '__all__' ? 'Todas as lojas' : printableReport.filters.store}</p>
            <p>Categoria: {printableReport.filters.category === '__all__' ? 'Todas as categorias' : printableReport.filters.category}</p>
            <table>
              <caption className={styles.srOnly}>Produtos mais vendidos no período e nos filtros selecionados</caption>
              <thead>
                <tr>
                  <th scope="col">Produto</th>
                  <th scope="col">Categoria</th>
                  <th scope="col">Unidades vendidas</th>
                </tr>
              </thead>
              <tbody>
                {printableReport.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.product}</td><td>{item.category}</td><td>{item.unitsSold.toLocaleString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>
      {detailsDialog && (
        <DetailsModal
          title="Relatório de produtos mais vendidos"
          description="Este pop-up mostra os filtros e os itens gravados no relatório selecionado."
          fields={detailsFields}
          triggerElement={detailsDialog.trigger}
          onClose={handleCloseDetails}
        >
          <h3>Produtos incluídos</h3>
          <div
            className={styles.tableWrap}
            role="region"
            {...keyboardScrollProps}
            aria-label="Produtos incluídos no relatório. Use as setas para rolar a tabela horizontalmente."
          >
            <table>
              <caption className={styles.srOnly}>Produtos incluídos no relatório de produtos mais vendidos</caption>
              <thead>
                <tr><th scope="col">Produto</th><th scope="col">Categoria</th><th scope="col">Unidades vendidas</th></tr>
              </thead>
              <tbody>
                {detailsDialog.record.items.map((item) => (
                  <tr key={item.id}>
                    <th scope="row">{item.product}</th>
                    <td>{item.category}</td>
                    <td>{item.unitsSold.toLocaleString('pt-BR')}</td>
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

export default ManagementReports;
