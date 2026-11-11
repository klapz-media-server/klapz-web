import styles from './SkeletonRow.module.css';

/** Placeholder cards shown inside a Slider while its query loads. */
export default function SkeletonRow({ count = 8, variant = 'poster' }) {
  return Array.from({ length: count }, (_, i) => (
    <div key={i} className={styles.card} data-variant={variant}>
      <div className={styles.image} />
      <div className={styles.line} />
      <div className={styles.lineShort} />
    </div>
  ));
}
