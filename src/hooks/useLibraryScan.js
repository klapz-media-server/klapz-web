import { useEffect, useRef } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client/react';
import { CANCEL_LIBRARY_SCAN, SCAN_LIBRARY } from '../graphql/mutations';
import { LIBRARY_SCAN_STATE } from '../graphql/queries';
import { analysisStage } from '../utils/analysis';

/** How often a running scan is asked about, in milliseconds. */
const POLL_MS = 2000;

/** How often the reading of a library's files is asked about: it takes minutes, then hours. */
const READING_POLL_MS = 5000;

/**
 * A library's scan: whether it runs, how far the files it found are read, and how to start or
 * stop it. While it runs its state is asked again every two seconds, and every five while its
 * files are read. Every query on screen is fetched again when the scan ends, since it may have
 * added or removed anything a page shows, and when a round of reading ends, since the files'
 * durations, codecs and tracks came with it.
 */
export function useLibraryScan(libraryId) {
  const client = useApolloClient();
  const { data } = useQuery(LIBRARY_SCAN_STATE, { variables: { id: libraryId }, skip: !libraryId });
  const scanning = !!data?.node?.scanning;
  const analysis = data?.node?.analysis ?? null;
  const reading = !!analysis?.reading;
  const round = analysisStage(analysis)?.round ?? null;
  const [scan, scanState] = useMutation(SCAN_LIBRARY);
  const [cancel, cancelState] = useMutation(CANCEL_LIBRARY_SCAN);
  const wasScanning = useRef(scanning);
  const lastRound = useRef(round);

  useEffect(() => {
    if (!scanning && !reading) return undefined;
    const timer = setInterval(
      () => {
        client.query({ query: LIBRARY_SCAN_STATE, variables: { id: libraryId }, fetchPolicy: 'network-only' }).catch(() => {});
      },
      scanning ? POLL_MS : READING_POLL_MS,
    );
    return () => clearInterval(timer);
  }, [client, libraryId, scanning, reading]);

  useEffect(() => {
    const scanEnded = wasScanning.current && !scanning;
    const roundEnded = lastRound.current !== null && lastRound.current !== round;
    if (scanEnded || roundEnded) client.refetchQueries({ include: 'active' });
    wasScanning.current = scanning;
    lastRound.current = round;
  }, [client, scanning, round]);

  return {
    scanning,
    scannedAt: data?.node?.scannedAt ?? null,
    /** Why the last scan stopped before its end, for the library's admins; null otherwise. */
    failure: data?.node?.scanFailure ?? null,
    /** `Library.analysis`: how far the files the scans found are read. */
    analysis,
    reading,
    busy: scanState.loading || cancelState.loading,
    /** Resolves to the refusal's code, or null once the scan started. */
    start: async ({ force = false } = {}) => {
      const { data: answer } = await scan({ variables: { input: { libraryId, force } } });
      return answer?.scanLibrary?.userErrors?.[0]?.code ?? null;
    },
    /** Stops the scan, and the reading of the library's files until its next scan. */
    stop: () => cancel({ variables: { input: { libraryId } } }),
  };
}
