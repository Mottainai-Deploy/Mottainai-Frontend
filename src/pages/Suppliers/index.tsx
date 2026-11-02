import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import ReusableTable from "@/components/ReusableTable";
import type { ReusableTableColumn, TableCellTone } from "@/types/reusable-table.types";
import type { SupplierRecord } from "@/types/supplier.types";
import styles from "./style.module.css";
import ConfirmedAction from '@/components/ConfirmedAction';
import { useSupplierDirectory } from '@/hooks/useSupplierDirectory';

const getSupplierStatusTone = (active: boolean): TableCellTone =>
  active ? "success" : "danger";

function Suppliers() {
  const directory = useSupplierDirectory();
  const { state, query, saving, filteredSuppliers, deletion, handleEditDraftChange, saveSupplierEdit, cancelSupplierEdit } = directory;
  const editInputRef = useRef<HTMLInputElement>(null);
  const feedbackRef = useRef<HTMLParagraphElement>(null);
  const editTriggerRef = useRef<HTMLButtonElement | null>(null);
  const isEditing = Boolean(state.editDraft);

  useEffect(() => {
    if (isEditing) {
      editInputRef.current?.focus();
    } else if (editTriggerRef.current?.isConnected) {
      editTriggerRef.current.focus();
    } else {
      feedbackRef.current?.focus();
    }
  }, [isEditing]);

  const columns: ReusableTableColumn<SupplierRecord>[] = [
    { id: "cnpj", header: "CNPJ", renderCell: (supplier) => supplier.cnpj },
    { id: "tradeName", header: "Nome", renderCell: (supplier) => supplier.tradeName },
    { id: "email", header: "Contato", renderCell: (supplier) => supplier.email },
    { id: "phone", header: "Telefone", renderCell: (supplier) => supplier.phone },
    {
      id: "status",
      header: "Status",
      renderCell: (supplier) => (supplier.active ? "Ativo" : "Inativo"),
      display: "badge",
      tone: (supplier) => getSupplierStatusTone(supplier.active),
      align: "center",
    },
    {
      id: "action",
      header: "Ação",
      renderCell: () => null,
      display: "action",
      actionText: () => "Editar",
      actionHasPopup: false,
      onAction: (supplier, event) => {
        if (saving || state.deletionUncertain) return;
        editTriggerRef.current = event.currentTarget;
        directory.edit(supplier);
      },
      actionLabel: (supplier) => `Editar fornecedor ${supplier.tradeName}`,
      align: "center",
    },
  ];

  const resultLabel =
    filteredSuppliers.length === 1
      ? "1 fornecedor encontrado."
      : `${filteredSuppliers.length} fornecedores encontrados.`;

  return (
    <section className={styles.page} aria-labelledby="suppliers-title">
      {query.status === 'loading' && <p role="status">Carregando fornecedores…</p>}
      {query.status === 'error' && <p role="alert">{query.error}</p>}
      {saving && <p role="status">Salvando fornecedor…</p>}
      <h1 className={styles["sr-only"]} id="suppliers-title">
        Fornecedores
      </h1>

      <div className={styles.toolbar}>
        <label className={styles.searchField} htmlFor="supplier-search">
          <span className={styles["sr-only"]}>Buscar fornecedor</span>
          <input
            id="supplier-search"
            type="search"
            value={state.search}
            onChange={(event) =>
              directory.search(event.target.value)
            }
            placeholder="Buscar por nome, CNPJ ou contato..."
          />
        </label>
        <Link className={styles.newSupplierButton} to="/stock/suppliers/new">
          <FontAwesomeIcon icon={faPlus} aria-hidden="true" />
          Novo fornecedor
        </Link>
      </div>

      <p className={styles["sr-only"]} role="status" aria-live="polite">
        {query.status === 'success' ? resultLabel : ''}
      </p>

      {state.feedback && (
        <p
          ref={feedbackRef}
          tabIndex={-1}
          className={`${styles.feedback} ${state.feedbackIsError ? styles.feedbackError : ""}`}
          role={state.feedbackIsError ? "alert" : "status"}
          aria-live="polite"
        >
          {state.feedback}
        </p>
      )}

      {state.editDraft && (
        <section className={styles.editPanel} aria-labelledby="supplier-edit-title">
          <div className={styles.editHeader}>
            <h2 id="supplier-edit-title">Editar fornecedor</h2>
            <span>Atualize o apelido, os contatos e o status do cadastro.</span>
          </div>
          <div className={styles.editFields}>
            <label className={styles.editField} htmlFor="supplier-edit-nickname">
              <span>Apelido</span>
              <input
                ref={editInputRef}
                id="supplier-edit-nickname"
                value={state.editDraft.tradeName}
                maxLength={150}
                disabled={saving || state.deletionUncertain}
                onChange={(event) => handleEditDraftChange("tradeName", event.target.value)}
              />
            </label>
            <label className={styles.editField} htmlFor="supplier-edit-email">
              <span>E-mail</span>
              <input id="supplier-edit-email" type="email" autoComplete="email" maxLength={150} disabled={saving || state.deletionUncertain}
                value={state.editDraft.email ?? ''} onChange={(event) => handleEditDraftChange('email', event.target.value)} />
            </label>
            <label className={styles.editField} htmlFor="supplier-edit-phone">
              <span>Telefone</span>
              <input id="supplier-edit-phone" type="tel" autoComplete="tel" maxLength={20} disabled={saving || state.deletionUncertain}
                value={state.editDraft.phone ?? ''} onChange={(event) => handleEditDraftChange('phone', event.target.value)} />
            </label>
            <label className={styles.editCheckbox} htmlFor="supplier-edit-active">
              <input
                id="supplier-edit-active"
                type="checkbox"
                checked={state.editDraft.active}
                disabled={saving || state.deletionUncertain}
                onChange={(event) => handleEditDraftChange("active", event.target.checked)}
              />
              Fornecedor ativo
            </label>
          </div>
          <div className={styles.editActions}>
            <button className={styles.cancelEditButton} type="button" onClick={cancelSupplierEdit} disabled={saving || state.deletionUncertain}>
              Cancelar
            </button>
            <button className={styles.saveEditButton} type="button" onClick={saveSupplierEdit} disabled={saving || state.deletionUncertain}>
              Salvar alterações
            </button>
          </div>
          <ConfirmedAction key={state.selectedSupplierId} label="Excluir fornecedor" effect={`Excluir o cadastro de ${state.editDraft.tradeName}? O servidor verificará os vínculos e as permissões.`}
            execute={deletion.execute} verify={deletion.verify} disabled={saving}
            onBusyChange={directory.busy}
            onUncertainChange={directory.uncertain} />
        </section>
      )}

      {query.status === 'success' && <div className={styles.tableSection}>
        <ReusableTable
          title="Fornecedores cadastrados"
          columns={columns}
          data={filteredSuppliers}
          rowKey={(supplier) => supplier.id}
          emptyMessage="Nenhum fornecedor corresponde à busca."
        />
      </div>}
    </section>
  );
}

export default Suppliers;
