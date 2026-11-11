import Icon from '../Icon/Icon';
import styles from './Button.module.css';

/**
 * Pill button. `variant`: primary (white), accent (yellow), secondary
 * (translucent), danger (red text), ghost (no background).
 */
export default function Button({ variant = 'secondary', icon, children, type = 'button', loading = false, size = 'md', className, ...props }) {
  return (
    <button
      type={type}
      className={[styles.button, className].filter(Boolean).join(' ')}
      data-variant={variant}
      data-size={size}
      data-loading={loading || undefined}
      {...props}
      disabled={props.disabled || loading}
    >
      {loading ? <span className={styles.spinner} aria-hidden="true" /> : icon && <Icon name={icon} size={size === 'sm' ? 16 : 18} />}
      {children && <span>{children}</span>}
    </button>
  );
}
