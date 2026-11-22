import { Navigate, Outlet, useLocation } from 'react-router';
import { useServers } from '../../hooks/useServers';
import { connectPath } from '../../utils/routes';

/**
 * Lets the app through only once a server is chosen; otherwise sends to `/connect`, which
 * comes back here. Keyed by the server: changing it starts every page over.
 */
export default function ServerGate() {
  const location = useLocation();
  const { active } = useServers();
  if (!active) return <Navigate to={connectPath(`${location.pathname}${location.search}${location.hash}`)} replace />;
  return <Outlet key={active.id} />;
}
