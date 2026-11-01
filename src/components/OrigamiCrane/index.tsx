import type { OrigamiCraneProps } from '@/types/origami-crane.types';
import spinnerCrane from '@/assets/icons/spinner-crane.svg';
import styles from './style.module.css';

function OrigamiCrane({ className }: OrigamiCraneProps) {
  const classNames = [styles.crane, className].filter(Boolean).join(' ');

  return (
    <img
      className={classNames}
      src={spinnerCrane}
      alt=""
      aria-hidden="true"
      decoding="async"
    />
  );
}

export default OrigamiCrane;
