import { useMutation } from '@apollo/client/react';
import { MARK_UNWATCHED, MARK_WATCHED } from '../graphql/mutations';

/**
 * Marks an item watched / unwatched and writes the new WatchState back on
 * the item in the cache.
 */
export function useWatchToggle(item) {
  const options = (field) => ({
    update(cache, { data }) {
      const state = data?.[field];
      if (!state || !item) return;
      cache.modify({
        id: cache.identify(item),
        fields: { watchState: (existing) => ({ ...existing, ...state }) },
      });
    },
  });
  const [markWatched, watchedResult] = useMutation(MARK_WATCHED, options('markWatched'));
  const [markUnwatched, unwatchedResult] = useMutation(MARK_UNWATCHED, options('markUnwatched'));

  const isWatched = !!item?.watchState?.isWatched;
  const toggle = () => {
    if (!item) return;
    const variables = { id: item.id };
    (isWatched ? markUnwatched : markWatched)({ variables }).catch(() => {});
  };

  return {
    isWatched,
    toggle,
    loading: watchedResult.loading || unwatchedResult.loading,
    error: watchedResult.error || unwatchedResult.error,
  };
}
