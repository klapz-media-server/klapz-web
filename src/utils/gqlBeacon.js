import { print } from 'graphql';
import { serverUrl } from '../servers/serverStore';

const GRAPHQL_PATH = import.meta.env.VITE_GRAPHQL_URL || '/graphql';

/**
 * Fire-and-forget GraphQL request that survives the page going away
 * (`keepalive`), for the last reports of a playback: stop the stream,
 * keep the position.
 */
export function sendBeacon(document, variables) {
  try {
    fetch(serverUrl(GRAPHQL_PATH), {
      method: 'POST',
      keepalive: true,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: print(document), variables }),
    }).catch(() => {});
  } catch {
    /* page already gone */
  }
}
