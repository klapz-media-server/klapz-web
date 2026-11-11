import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Icon from '../Icon/Icon';
import styles from './PasswordField.module.css';

/** Password input with a show / hide toggle. */
export default function PasswordField({ label, hint, error, autoComplete = 'current-password', ...props }) {
  const { t } = useTranslation();
  const id = useId();
  const [visible, setVisible] = useState(false);
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <div className={styles.wrap}>
        <input
          id={id}
          className={styles.input}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={hint || error ? `${id}-hint` : undefined}
          {...props}
        />
        <button
          type="button"
          className={styles.toggle}
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? t('Hide the password') : t('Show the password')}
          aria-pressed={visible}
        >
          <Icon name={visible ? 'eyeOff' : 'eye'} size={18} />
        </button>
      </div>
      {(error || hint) && (
        <p id={`${id}-hint`} className={styles.hint} data-error={error ? true : undefined}>
          {error || hint}
        </p>
      )}
    </div>
  );
}
