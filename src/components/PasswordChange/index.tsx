import { useEffect, useRef } from 'react';
import { usePasswordChange } from '@/hooks/usePasswordChange';
import styles from '@/styles/operations.module.css';

export default function PasswordChange() {
  const editor = usePasswordChange();
  const { state } = editor;
  const review = useRef<HTMLHeadingElement>(null);
  const feedback = useRef<HTMLParagraphElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (state.status === 'review') review.current?.focus(); if (state.status === 'error') feedback.current?.focus(); }, [state.status]);
  return <section className={styles.page} aria-labelledby="password-change-title">
    <h2 id="password-change-title">Alterar senha operacional</h2>
    <p>A senha Firebase permanece a mesma. Esta alteração encerra suas sessões operacionais e exige novo login.</p>
    <p>Use de 8 a 72 caracteres, com maiúscula, minúscula, número e símbolo. Termos previsíveis também podem ser recusados pelo servidor.</p>
    <form className={styles.card} noValidate onSubmit={event => { event.preventDefault(); editor.review(); }}>
      <fieldset className={styles.fields} disabled={state.status === 'saving' || state.status === 'review'}>
        <legend>Senhas da conta operacional</legend>
        <label htmlFor="password-change-current">Senha operacional atual</label>
        <input id="password-change-current" type="password" autoComplete="current-password" required maxLength={128} value={state.values.currentPassword} onChange={event => editor.change('currentPassword', event.target.value)} />
        <label htmlFor="password-change-new">Nova senha operacional</label>
        <input id="password-change-new" type="password" autoComplete="new-password" required minLength={8} maxLength={72} value={state.values.newPassword} onChange={event => editor.change('newPassword', event.target.value)} />
        <label htmlFor="password-change-confirmation">Confirmar nova senha operacional</label>
        <input id="password-change-confirmation" type="password" autoComplete="new-password" required maxLength={72} value={state.values.confirmation} onChange={event => editor.change('confirmation', event.target.value)} />
        <button ref={trigger} type="submit">Revisar troca de senha</button>
      </fieldset>
    </form>
    {state.status === 'review' && <div className={styles.card}>
      <h3 ref={review} tabIndex={-1}>Confirmar troca de senha operacional</h3>
      <p>As sessões serão encerradas. Entre novamente com sua senha de acesso Firebase. A nova senha operacional será usada nas operações que a exigirem.</p>
      <div className={styles.actions}>
        <button type="button" onClick={() => void editor.confirm()}>Confirmar troca de senha</button>
        <button type="button" onClick={() => { editor.cancel(); window.requestAnimationFrame(() => trigger.current?.focus()); }}>Cancelar troca de senha</button>
      </div>
    </div>}
    {state.message && <p ref={feedback} tabIndex={-1} role={state.status === 'error' ? 'alert' : 'status'}>{state.message}</p>}
    {state.status === 'error' && <button type="button" onClick={editor.leave}>Encerrar sessão e ir ao login</button>}
  </section>;
}
