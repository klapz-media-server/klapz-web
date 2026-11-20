import { Fragment } from 'react';
import styles from './MetaLine.module.css';

/** `[U] 2013 · 1 h 39 · Comedy, Animation` */
export default function MetaLine({ badge, items }) {
  const parts = (items ?? []).filter(Boolean);
  if (!badge && !parts.length) return null;
  return (
    <p className={styles.line}>
      {badge && <span className={styles.badge}>{badge}</span>}
      {parts.map((part, i) => (
        <Fragment key={i}>
          {i > 0 && <span className={styles.sep} aria-hidden="true" />}
          <span className={styles.part}>{part}</span>
        </Fragment>
      ))}
    </p>
  );
}
