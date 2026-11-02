import { useEffect, useId, useRef } from 'react';
import type { ConfirmedActionProps } from '@/types/confirmed-action.types';
import { useConfirmedAction } from '@/hooks/useConfirmedAction';
import styles from '@/styles/operations.module.css';

export default function ConfirmedAction(props: ConfirmedActionProps) {
  const action = useConfirmedAction(props);
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const feedback = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (action.state.stage === 'review') heading.current?.focus(); if (['success', 'error', 'uncertain'].includes(action.state.stage)) feedback.current?.focus(); }, [action.state.stage]);
  return <section className={styles.page} aria-label={props.label}>
    {!['review', 'saving', 'uncertain'].includes(action.state.stage) && <button ref={trigger} type="button" disabled={props.disabled} onClick={action.review}>{props.label}</button>}
    {action.state.stage === 'review' && <div className={styles.card} aria-labelledby={id}>
      <h3 ref={heading} tabIndex={-1} id={id}>{props.label}</h3>
      <p>{props.effect}</p>
      <div className={styles.actions}>
        <button type="button" disabled={props.disabled} onClick={() => void action.confirm()}>Confirmar: {props.label}</button>
        <button type="button" disabled={props.disabled} onClick={() => { action.cancel(); window.requestAnimationFrame(() => trigger.current?.focus()); }}>Cancelar</button>
      </div>
    </div>}
    {action.state.message && <p ref={feedback} tabIndex={-1} role={['error', 'uncertain'].includes(action.state.stage) ? 'alert' : 'status'}>{action.state.message}</p>}
    {action.state.stage === 'uncertain' && <>
      <p>O resultado foi inconclusivo. Consulte os dados antes de repetir.</p>
      <button type="button" disabled={props.disabled && action.state.stage !== 'uncertain'} onClick={() => void action.verify()}>Consultar estado da operação</button>
    </>}
  </section>;
}
