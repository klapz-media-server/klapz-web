import Icon from '../Icon/Icon';
import styles from './ActionButton.module.css';

/**
 * `variant="primary"`: the wide white pill ("Lire").
 * `variant="round"`: the circular icon button with a caption underneath.
 */
export default function ActionButton({ icon, label, variant = 'round', active, onClick, disabled, title }) {
  return (
    <button
      type="button"
      className={styles[variant]}
      data-active={active || undefined}
      onClick={onClick}
      disabled={disabled}
      title={title ?? label}
      aria-pressed={variant === 'round' && active !== undefined ? !!active : undefined}
    >
      {variant === 'round' ? (
        <>
          <span className={styles.circle}>
            <Icon name={icon} size={20} />
          </span>
          <span className={styles.caption}>{label}</span>
        </>
      ) : (
        <>
          {icon && <Icon name={icon} size={20} />}
          <span>{label}</span>
        </>
      )}
    </button>
  );
}
