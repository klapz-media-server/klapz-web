import { useEffect, useRef } from 'react';
import styles from './Dialog.module.css';

/**
 * Modal built on <dialog> (focus trap, Escape, backdrop for free).
 * Rendered only while `open`; `onClose` fires on Escape or backdrop click.
 * `size="wide"` for a form: wider, and its body scrolls between a fixed title and actions.
 */
export default function Dialog({ open, onClose, title, description, children, actions, tone, size }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return undefined;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    return undefined;
  }, [open]);

  if (!open) return null;
  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      data-tone={tone}
      data-size={size}
      onCancel={(e) => {
        e.preventDefault();
        onClose?.();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose?.();
      }}
    >
      <div className={styles.body}>
        {title && <h2 className={styles.title}>{title}</h2>}
        {description && <p className={styles.description}>{description}</p>}
        {children}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </dialog>
  );
}
