import { useEffect, useId, useRef } from 'react';
import type { ErrorModalProps } from '@/types/error-modal.types';
import invalidLinkCross from '@/assets/imgs/password-recovery/invalid-link-x.svg';
import invalidLinkSeal from '@/assets/imgs/password-recovery/invalid-link-seal.svg';
import styles from './style.module.css';

function ErrorModal({ isOpen, title, message, onBack, onClose }: ErrorModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const messageId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
      confirmRef.current?.focus();
    }
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={messageId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className={styles.brand} aria-hidden="true">
        <span className={styles.brandWordmark}>mottainai</span>
        <span className={styles.brandJapanese} lang="ja">もったいない</span>
      </div>

      <div className={styles.content}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>Ocorreu um erro</p>
          <h2 id={titleId}>{title}</h2>
          <p id={messageId} className={styles.message}>{message}</p>
        </div>
        <div className={styles.errorMark} aria-hidden="true">
          <img src={invalidLinkSeal} alt="" />
          <img src={invalidLinkCross} alt="" />
        </div>
      </div>

      <div className={styles.waves} aria-hidden="true">
        <span className={`${styles.wave} ${styles.waveBlue}`} />
        <span className={`${styles.wave} ${styles.waveOrange}`} />
        <span className={`${styles.wave} ${styles.waveCyan}`} />
      </div>

      <button ref={confirmRef} className={styles.confirm} type="button" onClick={onBack}>
        Voltar para o login
      </button>
    </dialog>
  );
}

export default ErrorModal;
