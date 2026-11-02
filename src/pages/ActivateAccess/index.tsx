import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '@/components/AuthLayout';
import ErrorModal from '@/components/ErrorModal';
import { useAccessActivation } from '@/hooks/useAccessActivation';
import styles from '@/styles/operations.module.css';

export default function ActivateAccess() {
  const location = useLocation();
  const navigate = useNavigate();
  const token = new URLSearchParams(location.hash.slice(1)).get('token') ?? '';
  const { state, change, submit } = useAccessActivation(token);
  const hasError = !token || state.status === 'error';
  const [dismissedError, setDismissedError] = useState<string | null>(null);
  const errorIdentity = `${location.key}:${state.status}:${state.message}`;
  const isErrorModalOpen = hasError && dismissedError !== errorIdentity;
  const errorTitle = token ? 'Não foi possível ativar seu acesso' : 'Link de convite inválido';
  const errorMessage = token
    ? state.message
    : 'O link do convite está incompleto ou inválido. Abra o link completo que você recebeu ou solicite um novo convite ao responsável pelo seu acesso.';

  return <AuthLayout title="Ativar acesso por convite" description="Confirme sua conta Firebase e defina a senha operacional." artworkVariant={token ? 'unavailable' : 'invalid-link'}>
    <form className={styles.page} onSubmit={event => { event.preventDefault(); setDismissedError(null); void submit(); }}>
      <p>A senha Firebase é a que você já usa nessa conta. Você pode definir a mesma senha para o acesso operacional.</p>
      <fieldset className={styles.fields} disabled={!token || state.status === 'saving' || state.status === 'success'}>
        <legend>Dados para ativação</legend>
        <div className={styles.field}><label htmlFor="activation-email">E-mail da conta Firebase</label><input id="activation-email" type="email" autoComplete="username" required value={state.draft.email} onChange={e => change('email', e.target.value)} /></div>
        <div className={styles.field}><label htmlFor="activation-firebase-password">Senha Firebase atual</label><input id="activation-firebase-password" type="password" autoComplete="current-password" required value={state.draft.firebasePassword} onChange={e => change('firebasePassword', e.target.value)} /></div>
        <p id="activation-password-help">Senha operacional: de 8 a 72 caracteres, com maiúscula, minúscula, número e símbolo.</p>
        <div className={styles.field}><label htmlFor="activation-new-password">Nova senha operacional</label><input id="activation-new-password" type="password" autoComplete="new-password" aria-describedby="activation-password-help" required value={state.draft.newPassword} onChange={e => change('newPassword', e.target.value)} /></div>
        <div className={styles.field}><label htmlFor="activation-confirmation">Confirmar senha operacional</label><input id="activation-confirmation" type="password" autoComplete="new-password" required value={state.draft.confirmation} onChange={e => change('confirmation', e.target.value)} /></div>
        <button type="submit">Ativar meu acesso</button>
      </fieldset>
      {state.message && state.status !== 'error' && <p role="status">{state.message}</p>}
      {hasError && !isErrorModalOpen && <p role="alert">{errorMessage}</p>}
      <Link to="/login">Ir para o login</Link>
    </form>
    <ErrorModal
      isOpen={isErrorModalOpen}
      title={errorTitle}
      message={errorMessage}
      onBack={() => navigate('/login', { replace: true })}
      onClose={() => setDismissedError(errorIdentity)}
    />
  </AuthLayout>;
}
