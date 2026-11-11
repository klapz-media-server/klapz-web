import { Navigate, useLocation } from 'react-router';
import { useViewer } from '../../hooks/useViewer';
import { queryString } from '../../utils/routes';
import Spinner from '../Spinner/Spinner';

/**
 * Sends someone the server does not know to the sign-in page, then back
 * here. The operator (a trusted network) and a signed-in user go through, as
 * does everyone on a server too old to say who is asking.
 */
export default function SessionGate({ children }) {
  const location = useLocation();
  const { viewer, loading, anonymous } = useViewer();
  if (loading && !viewer) return <Spinner fullPage />;
  if (anonymous) {
    const next = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/sign-in${queryString({ next: next === '/' ? null : next })}`} replace />;
  }
  return children;
}
