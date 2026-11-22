import { ApolloClient, ApolloLink, HttpLink, InMemoryCache } from '@apollo/client';
import { CombinedGraphQLErrors, ServerError } from '@apollo/client/errors';
import { ErrorLink } from '@apollo/client/link/error';
import { relayStylePagination } from '@apollo/client/utilities';
import { VIEWER } from '../graphql/queries';
import { serverUrl } from '../servers/serverStore';

const possibleTypes = {
  Item: ['Movie', 'Show', 'Season', 'Episode'],
  Node: [
    'User',
    'PlaybackSession',
    'PlayQueue',
    'PlayQueueEntry',
    'Server',
    'Library',
    'Root',
    'Movie',
    'Show',
    'Season',
    'Episode',
    'MediaVersion',
    'MediaFile',
    'MediaStream',
    'Tag',
    'Person',
  ],
};

/** Where the API is, on the chosen server (`serverStore`). */
export const GRAPHQL_PATH = import.meta.env.VITE_GRAPHQL_URL || '/graphql';

/** Asking again who is signed in, at most this often, however many requests fail at once. */
const SESSION_CHECK_MS = 5000;
// The first `viewer` query, on load, is the first check.
let lastCheck = Date.now();

/**
 * Asks the server again who the app is signed in as. A session that expired, or a user an
 * owner shut out, comes back as nobody: the cached `viewer` changes, and `SessionGate`
 * sends the page to sign-in. Called when a request fails in a way an ended session
 * explains — a GraphQL error, a `401` from a stream.
 */
export function checkSession() {
  const now = Date.now();
  if (now - lastCheck < SESSION_CHECK_MS) return;
  lastCheck = now;
  client.query({ query: VIEWER, fetchPolicy: 'network-only' }).catch(() => {});
}

// `/graphql` answers a lapsed session as nobody rather than 401: whatever the page asked
// then fails or comes back empty, and the viewer is what tells which.
const sessionLink = new ErrorLink(({ error, operation }) => {
  if (operation.operationName === 'Viewer') return;
  if (CombinedGraphQLErrors.is(error) || (ServerError.is(error) && error.statusCode === 401)) checkSession();
});

export const client = new ApolloClient({
  // The session is an HttpOnly cookie the server sets on sign-in: requests to the chosen
  // server carry it (`include`, as it may be another origin), and no script can read it.
  link: ApolloLink.from([
    sessionLink,
    new HttpLink({ uri: () => serverUrl(GRAPHQL_PATH), credentials: 'include' }),
  ]),
  cache: new InMemoryCache({
    possibleTypes,
    typePolicies: {
      Query: {
        fields: {
          search: relayStylePagination(['query', 'kinds']),
        },
      },
      Library: {
        fields: {
          // A page read at an offset is a list of its own, not a continuation of the first.
          items: relayStylePagination(['filter', 'orderBy', 'direction', 'seed', 'offset']),
        },
      },
      // Connections nested in items have no identity of their own.
      ItemTags: { merge: true },
      WatchState: { merge: true },
    },
  }),
});
