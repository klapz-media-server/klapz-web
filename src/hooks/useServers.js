import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { useNavigate } from 'react-router';
import { findServer, probeUrl } from '../servers/probe';
import * as store from '../servers/serverStore';

/** How often the known servers are asked again, while some component shows them. */
const REFRESH_MS = 30_000;

/*
 * The state of each server is not stored: it is only true now. It lives here, shared by every
 * component using the hook, and is kept out of `localStorage` (only `lastSeenAt` is saved).
 * `{ [id]: { status: 'checking' | 'online' | 'blocked' | 'invalid' | 'offline', checkedAt } }`
 */
let statuses = {};
const statusListeners = new Set();
const running = new Map();

function setStatus(id, status) {
  statuses = { ...statuses, [id]: { status, checkedAt: Date.now() } };
  for (const listener of statusListeners) listener();
}

function subscribeStatuses(listener) {
  statusListeners.add(listener);
  return () => statusListeners.delete(listener);
}

const getStatuses = () => statuses;

/** Asks one known server whether it answers, at most once at a time. */
function checkServer(server) {
  if (running.has(server.id)) return running.get(server.id);
  if (!statuses[server.id]) setStatus(server.id, 'checking');
  const check = probeUrl(server.url)
    .then((result) => {
      setStatus(server.id, result.status);
      if (result.status === 'online') {
        store.updateServer(server.id, {
          lastSeenAt: Date.now(),
          name: result.server.friendlyName || server.name,
          version: result.server.version,
          machineIdentifier: result.server.machineIdentifier,
        });
      }
      return result.status;
    })
    .finally(() => running.delete(server.id));
  running.set(server.id, check);
  return check;
}

function checkAll() {
  return Promise.all(store.getState().servers.map(checkServer));
}

let watchers = 0;
let timer = null;

function onVisible() {
  if (document.visibilityState === 'visible') checkAll();
}

/** Asks every server on the first watcher, then every 30 s while the tab is visible. */
function watch() {
  watchers += 1;
  if (watchers > 1) return;
  checkAll();
  timer = setInterval(() => {
    if (document.visibilityState === 'visible') checkAll();
  }, REFRESH_MS);
  document.addEventListener('visibilitychange', onVisible);
}

function unwatch() {
  watchers -= 1;
  if (watchers > 0) return;
  clearInterval(timer);
  timer = null;
  document.removeEventListener('visibilitychange', onVisible);
}

/**
 * The servers this browser knows, the one in use, and the state of each.
 *
 * - `servers`: the saved list, each with its `status` (`checking`, `online`, `blocked`,
 *   `invalid`, `offline`) when `watchStatus` is on;
 * - `active`: the server the app talks to, or null (the app then asks for one);
 * - `add(input, { onProgress, signal })`: finds the server from an address as typed, saves
 *   and selects it; resolves to `{ ok, server }` or `{ ok: false, code }` (see `findServer`);
 * - `remove(id)`, `select(id)`, `refresh()`.
 *
 * Changing server does not empty the Apollo cache: the caller does it (`useSwitchServer`).
 */
export function useServers({ watchStatus = false } = {}) {
  const state = useSyncExternalStore(store.subscribe, store.getState);
  const currentStatuses = useSyncExternalStore(subscribeStatuses, getStatuses);

  useEffect(() => {
    if (!watchStatus) return undefined;
    watch();
    return unwatch;
  }, [watchStatus]);

  // A server added meanwhile (here or in another tab) is asked at once.
  useEffect(() => {
    if (!watchStatus) return;
    for (const server of state.servers) if (!statuses[server.id]) checkServer(server);
  }, [watchStatus, state.servers]);

  const add = useCallback(async (input, options = {}) => {
    const found = await findServer(input, options);
    if (!found.ok) return found;
    const server = store.saveServer(
      {
        url: found.url,
        input: String(input).trim(),
        name: found.server.friendlyName || new URL(found.url).host,
        version: found.server.version,
        machineIdentifier: found.server.machineIdentifier,
        lastSeenAt: Date.now(),
      },
      { activate: true },
    );
    setStatus(server.id, 'online');
    return { ok: true, server };
  }, []);

  const remove = useCallback((id) => {
    store.removeServer(id);
    const { [id]: _gone, ...rest } = statuses;
    statuses = rest;
    for (const listener of statusListeners) listener();
  }, []);

  const select = useCallback((id) => store.selectServer(id), []);
  const refresh = useCallback(() => checkAll(), []);

  const servers = state.servers.map((server) => ({
    ...server,
    status: currentStatuses[server.id]?.status ?? (watchStatus ? 'checking' : null),
  }));

  return {
    servers,
    active: servers.find((s) => s.id === state.activeId) ?? null,
    add,
    remove,
    select,
    refresh,
  };
}

/**
 * Makes `id` the server the app talks to (null: none, back to choosing one) and starts the
 * app over on it: nothing seen on the former server stays in the cache, and its sign-in
 * (a cookie of that server) decides what comes next.
 */
export function useSwitchServer() {
  const client = useApolloClient();
  const navigate = useNavigate();
  return useCallback(
    async (id, to = '/') => {
      store.selectServer(id);
      await client.clearStore().catch(() => {});
      navigate(to, { replace: true });
    },
    [client, navigate],
  );
}
