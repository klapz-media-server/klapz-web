import { useCallback } from 'react';
import { useApolloClient, useQuery } from '@apollo/client/react';
import { SIGN_IN, SIGN_OUT, SIGN_UP } from '../graphql/mutations';
import { VIEWER } from '../graphql/queries';

/**
 * Who the app is signed in as, and signing in, up and out.
 *
 * `viewer` is `{ role, user }`, both null when nobody is signed in: the server
 * then answers every query as if nothing existed. `owner` is whether the user
 * manages the server. `signIn` / `signUp` resolve to `{ ok, code, field }`,
 * `code` being the server's `AccountErrorCode` (or `NETWORK`).
 */
/**
 * Empties the cache and refetches what is on screen. The page usually navigates
 * at the same moment, which aborts those refetches: that is expected, not a failure.
 */
const reset = (client) => client.resetStore().catch(() => {});

export function useViewer() {
  const client = useApolloClient();
  // previousData: signing in or out resets the store, and the page must not flash empty.
  const { data, previousData, loading, error, refetch } = useQuery(VIEWER, { errorPolicy: 'all' });
  const viewer = (data ?? previousData)?.viewer ?? null;

  const signIn = useCallback(
    async (login, password) => {
      try {
        const { data: answer } = await client.mutate({ mutation: SIGN_IN, variables: { input: { login: login.trim(), password } } });
        const failure = answer?.signIn?.userErrors?.[0];
        if (failure || !answer?.signIn?.user) return { ok: false, code: failure?.code ?? 'INVALID_CREDENTIALS' };
        // Everything visible changes with who is asking.
        await reset(client);
        return { ok: true };
      } catch (e) {
        return { ok: false, code: 'NETWORK', message: e.message };
      }
    },
    [client],
  );

  const signUp = useCallback(
    async ({ username, email, password }) => {
      try {
        const input = { username: username.trim(), email: email.trim() || null, password };
        const { data: answer } = await client.mutate({ mutation: SIGN_UP, variables: { input } });
        const failure = answer?.signUp?.userErrors?.[0];
        return failure ? { ok: false, code: failure.code, field: failure.field?.at(-1) } : { ok: !!answer?.signUp?.created };
      } catch (e) {
        return { ok: false, code: 'NETWORK', message: e.message };
      }
    },
    [client],
  );

  const signOut = useCallback(async () => {
    try {
      await client.mutate({ mutation: SIGN_OUT });
    } finally {
      await reset(client);
    }
  }, [client]);

  return {
    viewer,
    user: viewer?.user ?? null,
    owner: viewer?.role === 'OWNER',
    loading: loading && !viewer,
    error,
    refetch,
    signIn,
    signUp,
    signOut,
  };
}
