import styles from './ProgressBar.module.css';

export default function ProgressBar({ value, className }) {
  if (!value || value <= 0) return null;
  return (
    <div
      className={[styles.bar, className].filter(Boolean).join(' ')}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
    >
      <div className={styles.fill} style={{ width: `${Math.max(2, value * 100)}%` }} />
    </div>
  );
}
