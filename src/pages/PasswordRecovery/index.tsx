import { useId, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '@/components/AuthLayout';
import styles from '@/components/AuthLayout/style.module.css';
import { useMinimumLoadingVisibility } from '@/hooks/useMinimumLoadingVisibility';
import { waitForMinimumLoadingDuration } from '@/utils/minimumLoadingDuration';

import type {
  PasswordRecoveryState,
  RecoveryLocationState,
} from '@/types/password-recovery.types';

import {
  sendRecoveryCode,
  verifyRecoveryCode,
} from '@/services/passwordRecoveryService';

import {
  validateRecoveryCode,
  validateRecoveryEmail,
  sanitizeRecoveryCode,
  sanitizeRecoveryEmail,
} from '@/utils/passwordRecoveryValidation';

function PasswordRecovery() {
  const location = useLocation();
  const navigate = useNavigate();
  const emailFieldId = useId();
  const codeFieldId = useId();
  const feedbackId = useId();
  const locationState = location.state as RecoveryLocationState | null;

  const [state, setState] = useState<PasswordRecoveryState>({
    step: 'email',
    email: locationState?.userEmail ?? '',
    code: '',
    isLoading: false,
    feedback: null,
    feedbackType: null,
    fieldErrors: {},
  });
  const minimumLoadingVisible = useMinimumLoadingVisibility(state.isLoading);
  const showLoading = state.isLoading || minimumLoadingVisible;

  function updateState(changes: Partial<PasswordRecoveryState>) {
    setState((previous) => ({ ...previous, ...changes }));
  }

  function handleEmailChange(event: ChangeEvent<HTMLInputElement>) {
    updateState({ email: event.target.value, feedback: null, feedbackType: null, fieldErrors: { ...state.fieldErrors, email: undefined } });
  }

  function handleCodeChange(event: ChangeEvent<HTMLInputElement>) {
    const code = sanitizeRecoveryCode(event.target.value);
    updateState({ code, feedback: null, feedbackType: null, fieldErrors: { ...state.fieldErrors, code: undefined } });
  }

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validateRecoveryEmail(state.email);
    if (validationError) {
      updateState({ feedback: null, feedbackType: null, fieldErrors: { email: validationError } });
      window.requestAnimationFrame(() => document.getElementById(emailFieldId)?.focus());
      return;
    }

    const startedAt = performance.now();
    updateState({ isLoading: true, feedback: null, feedbackType: null });
    try {
      const response = await sendRecoveryCode(sanitizeRecoveryEmail(state.email));
      await waitForMinimumLoadingDuration(startedAt);
      updateState({
        step: 'code',
        isLoading: false,
        feedback: response.message,
        feedbackType: 'success',
        fieldErrors: {},
      });
    } catch (error) {
      await waitForMinimumLoadingDuration(startedAt);
      updateState({
        isLoading: false,
        feedback: error instanceof Error ? error.message : 'Não foi possível enviar o código.',
        feedbackType: 'error',
      });
    }
  }

  async function handleCodeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validateRecoveryCode(state.code);
    if (validationError) {
      updateState({ feedback: null, feedbackType: null, fieldErrors: { code: validationError } });
      window.requestAnimationFrame(() => document.getElementById(codeFieldId)?.focus());
      return;
    }

    const startedAt = performance.now();
    updateState({ isLoading: true, feedback: null, feedbackType: null });
    try {
      const response = await verifyRecoveryCode(sanitizeRecoveryEmail(state.email), sanitizeRecoveryCode(state.code));
      await waitForMinimumLoadingDuration(startedAt);
      navigate(`/newPassword?token=${encodeURIComponent(response.resetToken)}`, {
        replace: true,
        state: { userEmail: state.email.trim() },
      });
    } catch (error) {
      await waitForMinimumLoadingDuration(startedAt);
      updateState({
        isLoading: false,
        feedback: error instanceof Error ? error.message : 'Não foi possível verificar o código.',
        feedbackType: 'error',
      });
    }
  }

  function handleBackToEmail() {
    updateState({ step: 'email', code: '', feedback: null, feedbackType: null, fieldErrors: {} });
  }

  function handleBackToLogin() {
    navigate('/login');
  }

  const feedback = state.feedback && !showLoading ? (
    <p
      id={feedbackId}
      className={`${styles.feedbackMessage} ${state.feedbackType === 'error' ? styles.errorMessage : styles.successMessage}`}
      role={state.feedbackType === 'error' ? 'alert' : 'status'}
      aria-live="polite"
    >
      {state.feedback}
    </p>
  ) : null;

  if (state.step === 'email') {
    return (
      <AuthLayout
        title="Recupere sua senha"
        description="Informe seu e-mail e enviaremos um código para você criar uma nova senha."
        artworkVariant="recovery-email"
      >
        <form
          className={styles.form}
          onSubmit={handleEmailSubmit}
          noValidate
          aria-describedby={!showLoading && state.feedback ? feedbackId : undefined}
        >
          {feedback}
          {showLoading && (
            <p className={styles.codeHint} role="status" aria-live="polite">Enviando código...</p>
          )}
          <label htmlFor={emailFieldId} className={styles.visuallyHidden}>E-mail</label>
          <input
            id={emailFieldId}
            name="email"
            type="email"
            className={styles.input}
            placeholder="Digite seu e-mail"
            autoComplete="email"
            required
            value={state.email}
            onChange={handleEmailChange}
            maxLength={254}
            aria-invalid={Boolean(state.fieldErrors.email)}
            aria-describedby={state.fieldErrors.email ? `${emailFieldId}-error` : !showLoading && state.feedback ? feedbackId : undefined}
          />
          {state.fieldErrors.email && <p id={`${emailFieldId}-error`} className={styles.errorMessage} role="alert">{state.fieldErrors.email}</p>}
          <button type="submit" className={styles.submitButton} disabled={state.isLoading || showLoading}>
            {showLoading ? 'Enviando código...' : 'Enviar código'}
          </button>
          <button type="button" className={styles.backButton} onClick={handleBackToLogin}>
            Voltar para o login
          </button>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Verifique seu e-mail"
      description="Digite o código que enviamos para confirmar sua identidade."
      artworkVariant="recovery-code"
    >
      <form
        className={styles.form}
        onSubmit={handleCodeSubmit}
        noValidate
        aria-describedby={!showLoading && state.feedback ? feedbackId : undefined}
      >
        {feedback}
        {showLoading && (
          <p className={styles.codeHint} role="status" aria-live="polite">Verificando código...</p>
        )}
        <label htmlFor={codeFieldId} className={styles.visuallyHidden}>Código de recuperação</label>
        <input
          id={codeFieldId}
          name="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          className={styles.input}
          placeholder="Código de 6 dígitos"
          maxLength={6}
          required
          value={state.code}
          onChange={handleCodeChange}
          aria-invalid={Boolean(state.fieldErrors.code)}
          aria-describedby={state.fieldErrors.code ? `${codeFieldId}-error` : !showLoading && state.feedback ? feedbackId : undefined}
        />
        {state.fieldErrors.code && <p id={`${codeFieldId}-error`} className={styles.errorMessage} role="alert">{state.fieldErrors.code}</p>}
        <p className={styles.codeHint}>Para testar o fluxo, use o código 123456.</p>
        <button type="submit" className={styles.submitButton} disabled={state.isLoading || showLoading}>
          {showLoading ? 'Verificando...' : 'Verificar código'}
        </button>
        <button type="button" className={styles.secondaryButton} onClick={handleBackToEmail}>
          Usar outro e-mail
        </button>
      </form>
    </AuthLayout>
  );
}

export default PasswordRecovery
