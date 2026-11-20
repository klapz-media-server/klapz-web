import { useCallback, useEffect, useRef, useState } from 'react';
import { useApolloClient } from '@apollo/client/react';

/** Loaded pages still followed beyond the ones asked for; farther ones stop following the cache. */
const KEPT_PAGES = 12;

/**
 * A long listing read page by page at absolute offsets, only where it is looked at.
 *
 * Returns `{ item, request, error, loaded }`: `item(index)` is undefined while its page
 * is not loaded, `request(from, to)` asks for the pages covering that range of indexes. Each
 * page is a watched query, so a change in the cache (an item marked watched) shows.
 *
 * A page still loading when a request no longer covers it is cancelled — its HTTP request
 * aborted — so a scroll that moves on leaves nothing behind it. Pages that arrive together
 * are shown in one render.
 */
export function useOffsetPages({ query, variables, select, pageSize, total }) {
  const client = useApolloClient();
  const [pages, setPages] = useState({});
  const [error, setError] = useState(null);
  // page → { subscription, controller, loaded }
  const watched = useRef(new Map());
  const arrived = useRef({});
  const flushFrame = useRef(0);
  const key = JSON.stringify(variables);
  const latest = useRef({ variables, select, key });
  latest.current = { variables, select, key };

  // New variables: a new listing, from nothing.
  const [pagesKey, setPagesKey] = useState(key);
  if (pagesKey !== key) {
    setPagesKey(key);
    setPages({});
    setError(null);
  }

  const drop = (page) => {
    const entry = watched.current.get(page);
    if (!entry) return;
    entry.subscription.unsubscribe();
    if (!entry.loaded) entry.controller.abort();
    watched.current.delete(page);
  };

  useEffect(
    () => () => {
      for (const page of [...watched.current.keys()]) drop(page);
      cancelAnimationFrame(flushFrame.current);
      arrived.current = {};
    },
    [key],
  );

  // Every page that arrived since the last frame, in one state update.
  const deliver = useCallback((page, nodes) => {
    arrived.current[page] = nodes;
    if (flushFrame.current) return;
    flushFrame.current = requestAnimationFrame(() => {
      flushFrame.current = 0;
      const batch = arrived.current;
      arrived.current = {};
      setPages((p) => ({ ...p, ...batch }));
    });
  }, []);

  const request = useCallback(
    (from, to) => {
      if (!total) return;
      const first = Math.max(0, Math.floor(from / pageSize));
      const last = Math.min(Math.ceil(total / pageSize) - 1, Math.floor(Math.max(from, to - 1) / pageSize));
      const { variables: vars, select: pick, key: listing } = latest.current;

      // Whatever is still on its way for a place the view has left: cancelled. What loaded
      // stays followed a while, so coming back is instant and stays up to date.
      for (const [page, entry] of [...watched.current]) {
        const wanted = page >= first && page <= last;
        if (!wanted && (!entry.loaded || page < first - KEPT_PAGES / 2 || page > last + KEPT_PAGES / 2)) drop(page);
      }

      for (let page = first; page <= last; page++) {
        if (watched.current.has(page)) continue;
        const controller = new AbortController();
        const entry = { controller, loaded: false };
        const observable = client.watchQuery({
          query,
          variables: { ...vars, offset: page * pageSize, first: pageSize },
          context: { fetchOptions: { signal: controller.signal } },
        });
        entry.subscription = observable.subscribe({
          next: ({ data, error: failure }) => {
            if (latest.current.key !== listing) return;
            if (failure && failure.name !== 'AbortError') setError(failure);
            if (data) {
              entry.loaded = true;
              deliver(page, pick(data) ?? []);
            }
          },
          error: (failure) => latest.current.key === listing && failure.name !== 'AbortError' && setError(failure),
        });
        watched.current.set(page, entry);
      }
    },
    [client, query, pageSize, total, deliver],
  );

  const item = useCallback((index) => pages[Math.floor(index / pageSize)]?.[index % pageSize], [pages, pageSize]);

  return { item, request, error, loaded: Object.keys(pages).length > 0 };
}
