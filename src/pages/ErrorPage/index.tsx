import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import invalidLinkSealArtwork from '@/assets/imgs/password-recovery/invalid-link-seal.svg';
import invalidLinkCrossArtwork from '@/assets/imgs/password-recovery/invalid-link-x.svg';
import styles from './style.module.css';

function ErrorPage() {
  useEffect(() => {
    document.title = 'Página não encontrada | Mottainai';
  }, []);

  return (
    <>
      <a className="a11y-skip-link" href="#not-found-content">
        Pular para o conteúdo principal
      </a>
      <main className={styles.errorPage}>
        <header className={styles.brand} aria-label="Mottainai">
          <span className={styles.wordmark}>mottainai</span>
          <span className={styles.japanese} lang="ja">もったいない</span>
        </header>

        <section
          className={styles.message}
          id="not-found-content"
          aria-labelledby="not-found-title"
          tabIndex={-1}
        >
          <div className={styles.messageCopy}>
            <p className={styles.errorCode}>404</p>
            <h1 className={styles.title} id="not-found-title">
              Página não encontrada
            </h1>
            <p className={styles.description}>
              O endereço acessado não corresponde a uma página disponível.
            </p>
            <Link className={styles.homeLink} to="/home">
              Voltar para o início
            </Link>
          </div>

          <div className={styles.errorArtwork} aria-hidden="true">
            <img className={styles.seal} src={invalidLinkSealArtwork} alt="" />
            <img className={styles.cross} src={invalidLinkCrossArtwork} alt="" />
          </div>
        </section>

        <div className={styles.waves} aria-hidden="true" />
      </main>
    </>
  );
}

export default ErrorPage;
