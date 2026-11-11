import { useCallback } from 'react';
import { useApolloClient, useQuery } from '@apollo/client/react';
import { SIGN_IN, SIGN_OUT, SIGN_UP } from '../graphql/mutations';
import { VIEWER } from '../graphql/queries';

/**
 * Who the app is signed in as, and signing in, up and out.
 *
 * `viewer` is `{ isOperator, user }`: the operator when the server trusts
 * this network and no one signed in, a user with a session cookie, or
 * neither. `supported` is false on a server that predates `viewer`.
 * `signIn` / `signUp` resolve to `{ ok, code }`, `code` being the server's
 * `AccountErrorCode` (or `NETWORK`).
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
  const supported = !(error && /Unknown field "viewer"/.test(error.message));
  const viewer = (data ?? previousData)?.viewer ?? null;

  const signIn = useCallback(
    async (email, password) => {
      try {
        const { data: answer } = await client.mutate({ mutation: SIGN_IN, variables: { input: { email, password } } });
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
    async (email, password) => {
      try {
        const { data: answer } = await client.mutate({ mutation: SIGN_UP, variables: { input: { email, password } } });
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
    loading: loading && !viewer,
    error: supported ? error : null,
    supported,
    /** Nobody: the server neither trusts this network nor has a session for it. */
    anonymous: supported && !!viewer && !viewer.isOperator && !viewer.user,
    refetch,
    signIn,
    signUp,
    signOut,
  };
}
