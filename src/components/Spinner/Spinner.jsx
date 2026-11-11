import { useTranslation } from 'react-i18next';
import styles from './Spinner.module.css';

export default function Spinner({ label, fullPage = false }) {
  const { t } = useTranslation();
  return (
    <div className={styles.wrap} data-full={fullPage || undefined} role="status">
      <span className={styles.spinner} />
      <span className={styles.srOnly}>{label ?? t('Loading…')}</span>
    </div>
  );
}
