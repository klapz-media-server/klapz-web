import { useEffect, useRef } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client/react';
import { CANCEL_LIBRARY_SCAN, SCAN_LIBRARY } from '../graphql/mutations';
import { LIBRARY_SCAN_STATE } from '../graphql/queries';

/** How often a running scan is asked about, in milliseconds. */
const POLL_MS = 2000;

/**
 * A library's scan: whether it runs, and how to start or stop it. While it runs its state is
 * asked again every two seconds; when it ends, every query on screen is fetched again, since
 * the scan may have added or removed anything a page shows.
 */
export function useLibraryScan(libraryId) {
  const client = useApolloClient();
  const { data } = useQuery(LIBRARY_SCAN_STATE, { variables: { id: libraryId }, skip: !libraryId });
  const scanning = !!data?.node?.scanning;
  const [scan, scanState] = useMutation(SCAN_LIBRARY);
  const [cancel, cancelState] = useMutation(CANCEL_LIBRARY_SCAN);
  const wasScanning = useRef(scanning);

  useEffect(() => {
    if (!scanning) return undefined;
    const timer = setInterval(() => {
      client.query({ query: LIBRARY_SCAN_STATE, variables: { id: libraryId }, fetchPolicy: 'network-only' }).catch(() => {});
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [client, libraryId, scanning]);

  useEffect(() => {
    if (wasScanning.current && !scanning) client.refetchQueries({ include: 'active' });
    wasScanning.current = scanning;
  }, [client, scanning]);

  return {
    scanning,
    scannedAt: data?.node?.scannedAt ?? null,
    /** Why the last scan stopped before its end, for the library's admins; null otherwise. */
    failure: data?.node?.scanFailure ?? null,
    busy: scanState.loading || cancelState.loading,
    /** Resolves to the refusal's code, or null once the scan started. */
    start: async ({ force = false } = {}) => {
      const { data: answer } = await scan({ variables: { input: { libraryId, force } } });
      return answer?.scanLibrary?.userErrors?.[0]?.code ?? null;
    },
    stop: () => cancel({ variables: { input: { libraryId } } }),
  };
}
