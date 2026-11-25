import { CHIPS, LETTERS, VIEWBOX } from './logoPaths';
import styles from './Logo.module.css';

/** The Klapz logotype: ivory letters, the clapper chips in the accent colour. */
export default function Logo() {
  return (
    <svg className={styles.logo} viewBox={VIEWBOX} role="img" aria-label="Klapz">
      <path className={styles.letters} d={LETTERS} fillRule="evenodd" />
      <path className={styles.chips} d={CHIPS} fillRule="evenodd" />
    </svg>
  );
}
