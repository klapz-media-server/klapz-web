import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client';
import { relayStylePagination } from '@apollo/client/utilities';

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

export const client = new ApolloClient({
  // The session is an HttpOnly cookie the server sets on sign-in: same-origin requests carry
  // it, and no script can read it.
  link: new HttpLink({ uri: import.meta.env.VITE_GRAPHQL_URL || '/graphql', credentials: 'same-origin' }),
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
          items: relayStylePagination(['filter', 'orderBy', 'direction', 'seed']),
        },
      },
      // Connections nested in items have no identity of their own.
      ItemTags: { merge: true },
      WatchState: { merge: true },
    },
  }),
});
