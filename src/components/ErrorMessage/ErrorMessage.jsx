import { useTranslation } from 'react-i18next';
import Icon from '../Icon/Icon';
import styles from './ErrorMessage.module.css';

export default function ErrorMessage({ title, error, onRetry, children }) {
  const { t } = useTranslation();
  return (
    <div className={styles.box} role="alert">
      <Icon name="info" size={32} className={styles.icon} />
      <h2 className={styles.title}>{title ?? t('Something went wrong')}</h2>
      {error?.message && <p className={styles.detail}>{error.message}</p>}
      {children}
      {onRetry && (
        <button type="button" className={styles.retry} onClick={onRetry}>
          {t('Try again')}
        </button>
      )}
    </div>
  );
}
