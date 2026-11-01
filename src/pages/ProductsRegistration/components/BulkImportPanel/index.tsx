import DropdownSelect from "@/components/DropdownSelect";
import Spinner from "@/components/Spinner";
import { useMinimumLoadingVisibility } from "@/hooks/useMinimumLoadingVisibility";
import { faCheck, faCloudArrowUp, faFileLines } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { BulkImportPanelProps } from "@/types/product-registration-ui.types";
import styles from "@/pages/ProductsRegistration/style.module.css";

function formatFileSize(bytes: number): string {
  const megabytes = bytes / (1024 * 1024);
  return megabytes >= 1
    ? `${megabytes.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`
    : `${Math.max(1, bytes / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} KB`;
}

function BulkImportPanel({
  state,
  fileInputId,
  formatSelectId,
  busy,
  onSubmit,
  onFileChange,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDrop,
  onFormatChange,
  onCancel,
}: BulkImportPanelProps) {
  const minimumProcessingLoadingVisible = useMinimumLoadingVisibility(state.status === "processing");
  const showProcessingLoading = state.status === "processing" || minimumProcessingLoadingVisible;

  return (
    <div
      id="bulk-registration-panel"
      hidden={state.mode !== "bulk"}
      role="tabpanel"
      aria-labelledby="bulk-registration-tab"
      tabIndex={0}
    >
      <form id="bulk-registration-form" aria-labelledby="bulk-registration-tab" onSubmit={onSubmit}>
        <input
          className={styles["file-input"]}
          id={fileInputId}
          type="file"
          accept={`.${state.format}`}
          onChange={onFileChange}
        />
        <label
          className={`${styles.dropzone} ${state.isDragging ? styles.dragging : ""} ${state.file ? styles["has-file"] : ""}`}
          htmlFor={fileInputId}
          onDragEnter={onDragEnter}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          {state.file ? (
            <>
              <span className={styles["ready-label"]}>
                <FontAwesomeIcon icon={faCheck} /> Arquivo pronto para inserir
              </span>
              <span className={styles["selected-file"]} role="status">
                <FontAwesomeIcon icon={faFileLines} />
                <span>
                  <strong>{state.file.name}</strong>
                  <small>
                    {state.format.toUpperCase()} · {formatFileSize(state.file.size)}
                  </small>
                </span>
                <FontAwesomeIcon icon={faCheck} />
              </span>
              <span>Clique ou arraste outro arquivo para substituir</span>
            </>
          ) : (
            <>
              <span className={styles["upload-icon"]}>
                <FontAwesomeIcon icon={faCloudArrowUp} />
              </span>
              <strong>
                Arraste o arquivo {state.format.toUpperCase()} aqui ou clique para selecionar
              </strong>
              <span>Formato aceito: .{state.format} · máximo de 10 MB</span>
            </>
          )}
        </label>
        <div className={styles.actions}>
          <button className={styles.primary} type="submit" disabled={busy || showProcessingLoading}>
            {showProcessingLoading ? <Spinner label="Processando" /> : "Inserir"}
          </button>
          <button className={styles.secondary} type="button" onClick={onCancel} disabled={busy}>
            Cancelar
          </button>
          <label className={styles.format} htmlFor={formatSelectId}>
            Formato{" "}
            <DropdownSelect
              id={formatSelectId}
              value={state.format}
              disabled={busy}
              onChange={onFormatChange}
            >
              <option value="xml">XML</option>
              <option value="csv">CSV</option>
            </DropdownSelect>
          </label>
        </div>
        {state.message && (
          <p
            className={state.status === "error" ? styles.error : styles.message}
            role={state.status === "error" ? "alert" : "status"}
          >
            {state.message}
          </p>
        )}
      </form>
    </div>
  );
}

export default BulkImportPanel;
