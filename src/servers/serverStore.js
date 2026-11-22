/**
 * The servers this browser knows, and which one the app talks to, kept in `localStorage`.
 *
 * A small external store: `useServers` reads it with `useSyncExternalStore`, and code outside
 * React (the Apollo link, beacons, stream addresses) asks `activeServer()` / `serverUrl()`.
 * Each server is `{ id, url, name, version, machineIdentifier, input, addedAt, lastSeenAt }`,
 * `url` being its base address without a trailing slash (`https://media.example.com`,
 * `http://192.168.1.10:32500`). Another tab changing the list is followed through `storage`.
 */

export const STORAGE_KEY = 'klapz.servers';

const EMPTY = Object.freeze({ servers: [], activeId: null });

function read() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!stored || !Array.isArray(stored.servers)) return EMPTY;
    const servers = stored.servers.filter((s) => s && typeof s.id === 'string' && typeof s.url === 'string');
    const activeId = servers.some((s) => s.id === stored.activeId) ? stored.activeId : null;
    return { servers, activeId };
  } catch {
    return EMPTY;
  }
}

let state = read();
const listeners = new Set();

function emit() {
  for (const listener of listeners) listener();
}

function commit(next) {
  state = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private mode or a full quota: the list still holds for this page.
  }
  emit();
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== STORAGE_KEY && e.key !== null) return;
    state = read();
    emit();
  });
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getState() {
  return state;
}

/** The server the app talks to, or null before one is chosen. */
export function activeServer() {
  return state.servers.find((s) => s.id === state.activeId) ?? null;
}

/**
 * `path` on the active server: `/graphql` becomes `https://media.example.com/graphql`.
 * An absolute address is left as it is; without a server the path stays relative.
 */
export function serverUrl(path) {
  if (!path) return path;
  if (/^[a-z][a-z\d+.-]*:/i.test(path)) return path;
  const base = activeServer()?.url;
  if (!base) return path;
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
}

function newId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Adds a server, or updates the one already known at the same address or with the same
 * `machineIdentifier` (a server reached again by another address keeps its place). Returns it.
 */
export function saveServer(server, { activate = false } = {}) {
  const known = state.servers.find(
    (s) => s.url === server.url || (server.machineIdentifier && s.machineIdentifier === server.machineIdentifier),
  );
  const saved = known
    ? { ...known, ...server, id: known.id, addedAt: known.addedAt }
    : { ...server, id: newId(), addedAt: Date.now() };
  const servers = known ? state.servers.map((s) => (s.id === known.id ? saved : s)) : [...state.servers, saved];
  commit({ servers, activeId: activate ? saved.id : state.activeId });
  return saved;
}

/** Forgets a server; the active one falls back to nobody, so the app asks again. */
export function removeServer(id) {
  if (!state.servers.some((s) => s.id === id)) return;
  commit({
    servers: state.servers.filter((s) => s.id !== id),
    activeId: state.activeId === id ? null : state.activeId,
  });
}

export function selectServer(id) {
  if (id !== null && !state.servers.some((s) => s.id === id)) return;
  if (state.activeId === id) return;
  commit({ ...state, activeId: id });
}

/** Changes a few fields of a known server (its name, when it was last seen…). */
export function updateServer(id, fields) {
  if (!state.servers.some((s) => s.id === id)) return;
  commit({ ...state, servers: state.servers.map((s) => (s.id === id ? { ...s, ...fields } : s)) });
}

/** For tests: reads the storage again. */
export function reloadFromStorage() {
  state = read();
  emit();
}
