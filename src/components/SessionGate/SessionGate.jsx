import { useEffect } from 'react';
import { Link, Navigate, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { checkSession } from '../../apollo/client';
import { useViewer } from '../../hooks/useViewer';
import { connectPath, signInPath } from '../../utils/routes';
import ErrorMessage from '../ErrorMessage/ErrorMessage';
import Spinner from '../Spinner/Spinner';

/**
 * Lets through a signed-in user only; anyone else goes to the sign-in page, which sends
 * them back here. A session that ends meanwhile — it expired, or an owner shut the user
 * out — is noticed when a request fails and when the tab comes back into view.
 */
export default function SessionGate({ children }) {
  const { t } = useTranslation();
  const location = useLocation();
  const { viewer, user, loading, error, refetch } = useViewer();

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') checkSession();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  // A page whose item is "not found" may be a session that ended: asked again on each move.
  useEffect(() => {
    checkSession();
  }, [location.pathname]);

  const here = `${location.pathname}${location.search}${location.hash}`;
  if (loading) return <Spinner fullPage />;
  // Not knowing who is asking is no reason to show the sign-in page: the server may just be down.
  if (!viewer && error) {
    return (
      <ErrorMessage title={t('Server unreachable')} error={error} onRetry={() => refetch()}>
        <Link to={connectPath(here)}>{t('Change server')}</Link>
      </ErrorMessage>
    );
  }
  if (!user) return <Navigate to={signInPath(here)} replace />;
  return children;
}
