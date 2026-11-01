import { useId, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import AuthLayout from '@/components/AuthLayout';
import styles from '@/components/AuthLayout/style.module.css';
import { waitForMinimumLoadingDuration } from '@/utils/minimumLoadingDuration';
import type {
  NewPasswordState,
} from '@/types/password-recovery.types';
import { resetPassword } from '@/services/passwordRecoveryService';
import { sanitizeNewPassword, validateNewPassword } from '@/utils/passwordRecoveryValidation';

function NewPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const passwordFieldId = useId();
  const confirmationFieldId = useId();
  const feedbackId = useId();
  const resetToken = searchParams.get('token');

  const [state, setState] = useState<NewPasswordState>({
    form: { password: '', passwordConfirmation: '' },
    visibility: { password: false, confirmation: false },
    isLoading: false,
    feedback: null,
    feedbackType: null,
    validationErrors: {},
  });

  function handlePasswordChange(event: ChangeEvent<HTMLInputElement>) {
    setState((previous) => ({ ...previous, form: { ...previous.form, password: event.target.value }, validationErrors: { ...previous.validationErrors, password: undefined }, feedback: null, feedbackType: null }));
  }

  function handleConfirmationChange(event: ChangeEvent<HTMLInputElement>) {
    setState((previous) => ({ ...previous, form: { ...previous.form, passwordConfirmation: event.target.value }, validationErrors: { ...previous.validationErrors, passwordConfirmation: undefined }, feedback: null, feedbackType: null }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resetToken) {
      setState((previous) => ({
        ...previous,
        isLoading: false,
        feedback: 'Sua sessão de recuperação expirou. Solicite um novo código.',
        feedbackType: 'error',
      }));
      return;
    }

    const validationErrors = validateNewPassword(state.form.password, state.form.passwordConfirmation);
    if (Object.keys(validationErrors).length > 0) {
      setState((previous) => ({ ...previous, isLoading: false, feedback: null, feedbackType: null, validationErrors }));
      window.requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }

    const startedAt = performance.now();
    setState((previous) => ({ ...previous, isLoading: true, feedback: null, feedbackType: null, validationErrors: {} }));
    try {
      const response = await resetPassword(resetToken, sanitizeNewPassword(state.form.password));
      await waitForMinimumLoadingDuration(startedAt);
      setState((previous) => ({ ...previous, isLoading: false, feedback: response.message, feedbackType: 'success', validationErrors: {} }));
    } catch (error) {
      await waitForMinimumLoadingDuration(startedAt);
      setState((previous) => ({
        ...previous,
        isLoading: false,
        feedback: error instanceof Error ? error.message : 'Não foi possível alterar a senha.',
        feedbackType: 'error',
      }));
    }
  }

  function handleBackToLogin() {
    navigate('/login');
  }

  function handleRequestNewCode() {
    navigate('/passwordRecovery');
  }

  const feedback = state.feedback ? (
    <p
      id={feedbackId}
      className={`${styles.feedbackMessage} ${state.feedbackType === 'error' ? styles.errorMessage : styles.successMessage}`}
      role={state.feedbackType === 'error' ? 'alert' : 'status'}
      aria-live="polite"
    >
      {state.feedback}
    </p>
  ) : null;

  const isExpiredResetLink = state.feedbackType === 'error'
    && state.feedback === 'Sua sessão de recuperação expirou. Solicite um novo código.';

  if (!resetToken || isExpiredResetLink || state.feedbackType === 'success') {
    const passwordUpdated = state.feedbackType === 'success';

    return (
      <AuthLayout
        title={passwordUpdated ? 'Tudo certo!' : 'Link inválido'}
        description={passwordUpdated ? 'Sua senha foi atualizada.' : 'Solicite um novo código para continuar.'}
        artworkVariant={passwordUpdated ? 'password-updated' : 'invalid-link'}
      >
        <div className={styles.form} aria-describedby={state.feedback ? feedbackId : undefined}>
          {feedback}
          <button
            type="button"
            className={styles.submitButton}
            onClick={passwordUpdated ? handleBackToLogin : handleRequestNewCode}
          >
            {passwordUpdated ? 'Ir para o login' : 'Solicitar novo código'}
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Crie uma nova senha"
      description="Escolha uma senha segura para voltar a acessar sua conta."
      artworkVariant="new-password"
    >
      <form
        className={styles.form}
        onSubmit={handleSubmit}
        noValidate
        aria-describedby={state.feedback ? feedbackId : undefined}
      >
        {feedback}
        {state.isLoading && (
          <p className={styles.codeHint} role="status" aria-live="polite">Salvando sua nova senha...</p>
        )}
        <label htmlFor={passwordFieldId} className={styles.visuallyHidden}>Nova senha</label>
        <div className={styles.passwordField}>
          <input
            id={passwordFieldId}
            name="password"
            type={state.visibility.password ? 'text' : 'password'}
            className={styles.input}
            placeholder="Nova senha"
            autoComplete="new-password"
            required
            maxLength={128}
            value={state.form.password}
            onChange={handlePasswordChange}
            aria-invalid={Boolean(state.validationErrors.password)}
            aria-describedby={state.validationErrors.password ? `${passwordFieldId}-error` : undefined}
          />
          <button
            type="button"
            className={styles.togglePasswordButton}
            onClick={() => setState((current) => ({ ...current, visibility: { ...current.visibility, password: !current.visibility.password } }))}
            aria-pressed={state.visibility.password}
            aria-label={state.visibility.password ? 'Ocultar nova senha' : 'Mostrar nova senha'}
          >
            <FontAwesomeIcon icon={state.visibility.password ? faEyeSlash : faEye} aria-hidden="true" />
          </button>
        </div>
        {state.validationErrors.password && <p id={`${passwordFieldId}-error`} className={styles.errorMessage} role="alert">{state.validationErrors.password}</p>}
        <p className={styles.passwordRequirements}>Use pelo menos 8 caracteres.</p>
        <label htmlFor={confirmationFieldId} className={styles.visuallyHidden}>Confirme sua nova senha</label>
        <div className={styles.passwordField}>
          <input
            id={confirmationFieldId}
            name="passwordConfirmation"
            type={state.visibility.confirmation ? 'text' : 'password'}
            className={styles.input}
            placeholder="Confirme sua nova senha"
            autoComplete="new-password"
            required
            maxLength={128}
            value={state.form.passwordConfirmation}
            onChange={handleConfirmationChange}
            aria-invalid={Boolean(state.validationErrors.passwordConfirmation)}
            aria-describedby={state.validationErrors.passwordConfirmation ? `${confirmationFieldId}-error` : undefined}
          />
          <button
            type="button"
            className={styles.togglePasswordButton}
            onClick={() => setState((current) => ({ ...current, visibility: { ...current.visibility, confirmation: !current.visibility.confirmation } }))}
            aria-pressed={state.visibility.confirmation}
            aria-label={state.visibility.confirmation ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha'}
          >
            <FontAwesomeIcon icon={state.visibility.confirmation ? faEyeSlash : faEye} aria-hidden="true" />
          </button>
        </div>
        {state.validationErrors.passwordConfirmation && <p id={`${confirmationFieldId}-error`} className={styles.errorMessage} role="alert">{state.validationErrors.passwordConfirmation}</p>}
        <button type="submit" className={styles.submitButton} disabled={state.isLoading}>
          {state.isLoading ? 'Salvando...' : 'Alterar senha'}
        </button>
      </form>
    </AuthLayout>
  );
}

export default NewPassword
