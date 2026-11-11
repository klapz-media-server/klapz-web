import { useQuery } from '@apollo/client/react';
import { EDIT_SUPPORT } from '../graphql/queries';
import { useViewer } from './useViewer';

/**
 * Whether whoever uses the app may edit the items of a library: the operator, or a user
 * with the ADMIN role on it — as the server decides. False on a server that cannot edit.
 */
export function useCanEdit(libraryId) {
  const { data } = useQuery(EDIT_SUPPORT, { errorPolicy: 'all' });
  const { viewer, supported } = useViewer();
  if (!data?.__type) return false;
  // A server with editing but without accounts only admits its operator.
  if (!supported) return true;
  if (!viewer) return false;
  if (viewer.isOperator) return true;
  return !!viewer.user?.libraryPermissions.nodes.some((p) => p.role === 'ADMIN' && p.library?.id === libraryId);
}
