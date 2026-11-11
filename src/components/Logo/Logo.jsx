import styles from './Logo.module.css';

/** Wordmark of the app: "open" with a play chevron. */
export default function Logo() {
  return (
    <span className={styles.logo}>
      <span className={styles.word}>open</span>
      <svg className={styles.mark} viewBox="0 0 20 24" aria-hidden="true">
        <path d="M2 2l15 10L2 22z" />
      </svg>
    </span>
  );
}
