import { useId, useLayoutEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import type { LoginFormState } from '@/types/login.types';
import { useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '@/components/AuthLayout';
import styles from '@/components/AuthLayout/style.module.css';
import { useAuth } from '@/hooks/useAuth'
import { useMinimumLoadingVisibility } from '@/hooks/useMinimumLoadingVisibility';
import  Loading  from '@/components/Loading'
import { sanitizeLoginCredentials, validateLoginCredentials } from '@/utils/loginValidation';

export function Login() {
    const userEmailFieldId = useId();
    const passwordFieldId = useId();
    const errorMessageId = useId();

    const [formData, setFormData] = useState<LoginFormState>({
        userEmail: '',
        password: '',
        isPasswordVisible: false,
        errors: {},
    });

    const { login, isLoggingIn, error, isAuthenticated, notice } = useAuth();
    const isLoginLoadingVisible = useMinimumLoadingVisibility(isLoggingIn);
    const hasSubmittedLogin = useRef(false);
    const location = useLocation();
    const navigate = useNavigate();
    useLayoutEffect(() => { document.getElementById('login-password-changed')?.focus(); }, [location.key, isAuthenticated, notice]);

    useLayoutEffect(() => {
        if (isAuthenticated) {
            navigate('/home', {
                state: {
                    from: location,
                    showPostLoginLoading: hasSubmittedLogin.current,
                },
                replace: true,
            });
        }
    }, [isAuthenticated, navigate, location]);

    function handleUserEmailChange(event: ChangeEvent<HTMLInputElement>) {
        setFormData((previous) => ({ ...previous, userEmail: event.target.value, errors: { ...previous.errors, userEmail: undefined } }));
    }

    function handlePasswordChange(event: ChangeEvent<HTMLInputElement>) {
        setFormData((previous) => ({ ...previous, password: event.target.value, errors: { ...previous.errors, password: undefined } }));
    }

    function handleTogglePasswordVisibility() {
        setFormData((previous) => ({ ...previous, isPasswordVisible: !previous.isPasswordVisible }));
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const credentials = { email: formData.userEmail, password: formData.password };
        const validationErrors = validateLoginCredentials(credentials);
        if (Object.keys(validationErrors).length > 0) {
            setFormData((previous) => ({ ...previous, errors: { userEmail: validationErrors.email, password: validationErrors.password } }));
            window.requestAnimationFrame(() => {
                document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
            });
            return;
        }
        hasSubmittedLogin.current = true;
        await login(sanitizeLoginCredentials(credentials));
    }

    if (isAuthenticated) {
        return null;
    }

    if (isLoggingIn || isLoginLoadingVisible) {
        return (<Loading></Loading>)
    }

    return (
    <AuthLayout
        title="Bem-vindo de volta!"
        description="Simplificando seu estoque, tudo em um mesmo lugar."
      artworkVariant="login"
    >
        <form
            className={styles.form}
            onSubmit={handleSubmit}
            noValidate
            aria-describedby={error ? errorMessageId : undefined}
        >
            {(notice === 'password-changed' || (typeof location.state === 'object' && location.state !== null && 'passwordChanged' in location.state && location.state.passwordChanged === true)) && <p id="login-password-changed" tabIndex={-1} role="status">Senha operacional alterada. Entre novamente com sua senha de acesso Firebase.</p>}
            {error && (
            <p id={errorMessageId} role="alert" className={styles.errorMessage} data-a11y-light-surface="true">
                {error}
            </p>
            )}

            <label htmlFor={userEmailFieldId}>
            E-mail
            </label>
            <input
            id={userEmailFieldId}
            name="email"
            type="email"
            className={styles.input}
            placeholder="Email do Usuário"
            autoComplete="email"
            required
            maxLength={254}
            value={formData.userEmail}
            onChange={handleUserEmailChange}
            aria-invalid={Boolean(formData.errors.userEmail)}
            aria-describedby={formData.errors.userEmail ? `${userEmailFieldId}-error` : undefined}
            />
            {formData.errors.userEmail && <p id={`${userEmailFieldId}-error`} className={styles.errorMessage} role="alert" data-a11y-light-surface="true">{formData.errors.userEmail}</p>}

            <label htmlFor={passwordFieldId}>
            Senha
            </label>
            <div className={styles.passwordField}>
            <input
                id={passwordFieldId}
                name="password"
                type={formData.isPasswordVisible ? 'text' : 'password'}
                className={styles.input}
                placeholder="Senha"
                autoComplete="current-password"
                required
                maxLength={128}
                value={formData.password}
                onChange={handlePasswordChange}
                aria-invalid={Boolean(formData.errors.password)}
                aria-describedby={formData.errors.password ? `${passwordFieldId}-error` : undefined}
            />
            <button
                type="button"
                className={styles.togglePasswordButton}
                onClick={handleTogglePasswordVisibility}
                aria-pressed={formData.isPasswordVisible}
                aria-label={formData.isPasswordVisible ? 'Ocultar senha' : 'Mostrar senha'}
            >
                <svg
                    viewBox="0 0 24 24"
                    width="20"
                    height="20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    focusable="false"
                >
                    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
                    <circle cx="12" cy="12" r="3" />
                    {formData.isPasswordVisible && <path d="m3 3 18 18" />}
                </svg>
            </button>
            </div>
            {formData.errors.password && <p id={`${passwordFieldId}-error`} className={styles.errorMessage} role="alert" data-a11y-light-surface="true">{formData.errors.password}</p>}

            <button type="submit" className={styles.submitButton} disabled={isLoggingIn}>
            {isLoggingIn ? 'Entrando...' : 'Acessar Conta'}
            </button>
        </form>
    </AuthLayout>
    );
}

export default Login
