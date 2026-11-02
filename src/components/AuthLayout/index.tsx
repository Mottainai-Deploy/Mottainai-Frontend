import { useEffect } from 'react';
import type { ReactNode } from 'react';
import type { AuthArtworkVariant, AuthLayoutProps } from '@/types/auth-layout.types';
import styles from './style.module.css';
import mottainaiLogo120 from '@/assets/icons/Logo-Orange-120w.png';
import mottainaiLogo240 from '@/assets/icons/Logo-Orange-240w.png';
import loginCraneArtworkIcon from '@/assets/imgs/password-recovery/login-crane.svg';
import emailArtworkIcon from '@/assets/imgs/password-recovery/email.svg';
import verificationCodeArtworkIcon from '@/assets/imgs/password-recovery/verification-code.svg';
import passwordLockArtworkIcon from '@/assets/imgs/password-recovery/password-lock.svg';
import passwordUpdatedArtworkIcon from '@/assets/imgs/password-recovery/password-updated.svg';
import invalidLinkSealArtworkIcon from '@/assets/imgs/password-recovery/invalid-link-seal.svg';
import invalidLinkCrossArtworkIcon from '@/assets/imgs/password-recovery/invalid-link-x.svg';

function highlightedText(content: string): ReactNode {
  return <strong className={styles.orangeWord}>{content}</strong>;
}

function renderArtworkSlogan(variant: AuthArtworkVariant): ReactNode {
  switch (variant) {
    case 'login':
      return (
        <>
          <span className={styles.artworkLine}>O máximo de</span>
          <span className={styles.artworkLine}>{highlightedText('resultados')} com o</span>
          <span className={styles.artworkLine}>mínimo de</span>
          <span className={styles.artworkLine}>{highlightedText('desperdício')}.</span>
        </>
      );
    case 'recovery-email':
      return (
        <>
          <span className={styles.artworkLine}>Informe seu</span>
          <span className={styles.artworkLine}>{highlightedText('e-mail')} para</span>
          <span className={styles.artworkLine}>receber o {highlightedText('código')}.</span>
        </>
      );
    case 'recovery-code':
      return (
        <>
          <span className={styles.artworkLine}>Confirme seu</span>
          <span className={styles.artworkLine}>acesso com o</span>
          <span className={styles.artworkLine}>{highlightedText('código')}.</span>
        </>
      );
    case 'new-password':
      return (
        <>
          <span className={styles.artworkLine}>Crie sua</span>
          <span className={styles.artworkLine}>{highlightedText('nova senha')}</span>
          <span className={styles.artworkLine}>com segurança.</span>
        </>
      );
    case 'password-updated':
      return (
        <>
          <span className={styles.artworkLine}>Sua senha foi</span>
          <span className={styles.artworkLine}>{highlightedText('atualizada')}.</span>
        </>
      );
    case 'invalid-link':
      return (
        <>
          <span className={styles.artworkLine}>Link {highlightedText('inválido')}.</span>
          <span className={styles.artworkLine}>Solicite um</span>
          <span className={styles.artworkLine}>{highlightedText('novo código')}.</span>
        </>
      );
    case 'unavailable':
      return (
        <>
          <span className={styles.artworkLine}>Integração</span>
          <span className={styles.artworkLine}>{highlightedText('indisponível')}</span>
          <span className={styles.artworkLine}>no momento.</span>
        </>
      );
    default: {
      const exhaustiveCheck: never = variant;
      return exhaustiveCheck;
    }
  }
}

function renderArtworkIcons(variant: AuthArtworkVariant): ReactNode {
  switch (variant) {
    case 'login':
      return <img className={`${styles.artworkIcon} ${styles.artworkIconCrane}`} src={loginCraneArtworkIcon} alt="" />;
    case 'recovery-email':
      return <img className={`${styles.artworkIcon} ${styles.artworkIconEmail}`} src={emailArtworkIcon} alt="" />;
    case 'recovery-code':
      return <img className={`${styles.artworkIcon} ${styles.artworkIconCode}`} src={verificationCodeArtworkIcon} alt="" />;
    case 'new-password':
      return <img className={`${styles.artworkIcon} ${styles.artworkIconLock}`} src={passwordLockArtworkIcon} alt="" />;
    case 'password-updated':
      return <img className={`${styles.artworkIcon} ${styles.artworkIconUpdated}`} src={passwordUpdatedArtworkIcon} alt="" />;
    case 'invalid-link':
      return (
        <>
          <img className={`${styles.artworkIcon} ${styles.artworkIconInvalidSeal}`} src={invalidLinkSealArtworkIcon} alt="" />
          <img className={`${styles.artworkIcon} ${styles.artworkIconInvalidCross}`} src={invalidLinkCrossArtworkIcon} alt="" />
        </>
      );
    case 'unavailable':
      return null;
    default: {
      const exhaustiveCheck: never = variant;
      return exhaustiveCheck;
    }
  }
}

export function AuthLayout({ title, description, artworkVariant, children }: AuthLayoutProps) {
  useEffect(() => {
    document.title = `${title} | Mottainai`;
  }, [title]);

  return (
    <>
      <a className="a11y-skip-link" href="#auth-main">Pular para o conteúdo principal</a>
      <main className={styles.container} id="auth-main" tabIndex={-1}>
      <section className={styles.authSection} aria-labelledby="auth-page-title">
        <img
          src={mottainaiLogo120}
          srcSet={`${mottainaiLogo120} 120w, ${mottainaiLogo240} 240w`}
          sizes="(max-width: 420px) 88px, 120px"
          alt="Logotipo do Mottainai"
          className={styles.logo}
          width={120}
          height={121}
          decoding="async"
        />
        <h1 id="auth-page-title" className={styles.title}>{title}</h1>
        <p className={styles.subtitle}>{description}</p>
        {children}
      </section>

      <aside className={styles.artworkSection} aria-hidden="true">
        <div className={styles.artworkCanvas} data-artwork-variant={artworkVariant}>
          <div className={styles.artworkBrand}>
            <span className={styles.artworkWordmark}>mottainai</span>
            <span className={styles.artworkJapanese} lang="ja">もったいない</span>
          </div>
          <p className={styles.artworkSlogan} data-artwork-variant={artworkVariant}>
            {renderArtworkSlogan(artworkVariant)}
          </p>
          {renderArtworkIcons(artworkVariant)}
        </div>
      </aside>
      </main>
    </>
  );
}

export default AuthLayout;
