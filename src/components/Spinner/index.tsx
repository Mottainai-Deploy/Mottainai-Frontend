import type { SpinnerProps } from "@/types/spinner.types";
import OrigamiCrane from "@/components/OrigamiCrane";
import spinnerRing from "@/assets/icons/spinner-ring.svg";
import styles from "./style.module.css";

function Spinner({ label = "Carregando", size = "compact" }: SpinnerProps) {
  const isLarge = size === "large";
  const sizeClassName = isLarge ? styles.large : styles.compact;
  const wrapperClassName = [styles.wrapper, sizeClassName]
    .filter(Boolean)
    .join(" ");

  return (
    <span
      className={wrapperClassName}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <span className={styles.visual} aria-hidden="true">
        {isLarge ? (
          <>
            <span className={styles.ringOrbit} aria-hidden="true">
              <img className={styles.ringArtwork} src={spinnerRing} alt="" />
            </span>
            <span className={styles.craneLayer} aria-hidden="true">
              <OrigamiCrane />
            </span>
          </>
        ) : (
          <svg className={styles.ring} viewBox="0 0 100 100" aria-hidden="true">
            <circle className={styles.ringBack} cx="50" cy="50" r="42" />
            <path
              className={styles.ringFront}
              d="M 8 50 A 42 42 0 0 0 92 50 C 76 68 67 87 50 87 C 33 87 24 68 8 50 Z"
            />
          </svg>
        )}
      </span>
      <span className={isLarge ? styles.visuallyHidden : styles.label}>
        {label}
      </span>
    </span>
  );
}

export default Spinner;
