import { print } from 'graphql';

const URL = import.meta.env.VITE_GRAPHQL_URL || '/graphql';

/**
 * Fire-and-forget GraphQL request that survives the page going away
 * (`keepalive`), for the last reports of a playback: stop the stream,
 * keep the position.
 */
export function sendBeacon(document, variables) {
  try {
    fetch(URL, {
      method: 'POST',
      keepalive: true,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: print(document), variables }),
    }).catch(() => {});
  } catch {
    /* page already gone */
  }
}
