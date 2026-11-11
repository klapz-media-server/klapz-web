import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import ErrorMessage from '../../components/ErrorMessage/ErrorMessage';
import { usePageTitle } from '../../hooks/usePageTitle';
import styles from './NotFoundPage.module.css';

export default function NotFoundPage() {
  const { t } = useTranslation();
  usePageTitle(t('Page not found'));
  return (
    <div className={styles.page}>
      <ErrorMessage title={t('This page does not exist')}>
        <Link to="/" className={styles.home}>
          {t('Back to home')}
        </Link>
      </ErrorMessage>
    </div>
  );
}
