import { useAuth } from "@/hooks/useAuth";
import styles from "./style.module.css";
import PasswordChange from '@/components/PasswordChange';

function Account() {
  const { user } = useAuth();

  return (
    <section className={styles.page} aria-labelledby="account-title">
      <header className={styles.heading}>
        <p className={styles.eyebrow}>Conta</p>
        <h1 id="account-title">Minha conta</h1>
        <p>Dados associados à sessão autenticada.</p>
      </header>

      <dl className={styles.details}>
        <div className={styles.detail}>
          <dt>Nome</dt>
          <dd>{user?.name || "Não informado"}</dd>
        </div>
        <div className={styles.detail}>
          <dt>E-mail</dt>
          <dd>{user?.email || "Não informado"}</dd>
        </div>
        <div className={styles.detail}>
          <dt>Identificador da conta</dt>
          <dd>{user?.id || "Não informado"}</dd>
        </div>
      </dl>
      <PasswordChange />
    </section>
  );
}

export default Account;
