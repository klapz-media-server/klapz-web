import { useViewer } from './useViewer';

/**
 * Whether the signed-in user may edit the items of a library: an owner of the server, or a
 * user with the ADMIN role on it. The server stays the judge; this only decides what to offer.
 */
export function useCanEdit(libraryId) {
  const { user, owner } = useViewer();
  if (owner) return true;
  return !!user?.libraryPermissions.nodes.some((p) => p.role === 'ADMIN' && p.library?.id === libraryId);
}
