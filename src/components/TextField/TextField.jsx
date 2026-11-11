import { useId } from 'react';
import styles from './TextField.module.css';

/** Labelled text input with an optional hint and error. */
export default function TextField({ label, hint, error, className, inputRef, ...props }) {
  const id = useId();
  return (
    <div className={[styles.field, className].filter(Boolean).join(' ')}>
      {label && (
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
      )}
      <input
        id={id}
        ref={inputRef}
        className={styles.input}
        aria-invalid={error ? true : undefined}
        aria-describedby={hint || error ? `${id}-hint` : undefined}
        {...props}
      />
      {(error || hint) && (
        <p id={`${id}-hint`} className={styles.hint} data-error={error ? true : undefined}>
          {error || hint}
        </p>
      )}
    </div>
  );
}
