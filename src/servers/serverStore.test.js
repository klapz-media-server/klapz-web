import { beforeEach, describe, expect, it } from 'vitest';
import {
  STORAGE_KEY,
  activeServer,
  getState,
  reloadFromStorage,
  removeServer,
  saveServer,
  selectServer,
  serverUrl,
} from './serverStore';

beforeEach(() => {
  localStorage.clear();
  reloadFromStorage();
});

describe('serverStore', () => {
  it('starts with no server, and paths stay relative', () => {
    expect(getState()).toEqual({ servers: [], activeId: null });
    expect(activeServer()).toBeNull();
    expect(serverUrl('/graphql')).toBe('/graphql');
  });

  it('saves to localStorage and resolves paths on the active server', () => {
    const server = saveServer({ url: 'http://nas:32500', name: 'NAS' }, { activate: true });
    expect(activeServer()).toMatchObject({ id: server.id, url: 'http://nas:32500' });
    expect(serverUrl('/graphql')).toBe('http://nas:32500/graphql');
    expect(serverUrl('streams/x')).toBe('http://nas:32500/streams/x');
    expect(serverUrl('https://cdn/x.mpd')).toBe('https://cdn/x.mpd');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).activeId).toBe(server.id);
  });

  it('updates a server known by its address or its identifier rather than adding it twice', () => {
    const first = saveServer({ url: 'http://nas:32500', name: 'NAS', machineIdentifier: 'm1' });
    saveServer({ url: 'https://nas.example.com', name: 'NAS', machineIdentifier: 'm1' });
    saveServer({ url: 'https://nas.example.com', name: 'Renamed' });
    expect(getState().servers).toHaveLength(1);
    expect(getState().servers[0]).toMatchObject({ id: first.id, url: 'https://nas.example.com', name: 'Renamed' });
  });

  it('forgets the active server, leaving none chosen', () => {
    const a = saveServer({ url: 'http://a' }, { activate: true });
    const b = saveServer({ url: 'http://b' });
    removeServer(a.id);
    expect(getState()).toMatchObject({ servers: [{ id: b.id }], activeId: null });
    selectServer(b.id);
    expect(activeServer().id).toBe(b.id);
    selectServer('unknown');
    expect(activeServer().id).toBe(b.id);
  });

  it('ignores a damaged storage', () => {
    localStorage.setItem(STORAGE_KEY, '{oops');
    reloadFromStorage();
    expect(getState()).toEqual({ servers: [], activeId: null });
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ servers: [{ id: 'x', url: 'http://x' }, { nope: 1 }], activeId: 'gone' }));
    reloadFromStorage();
    expect(getState()).toEqual({ servers: [{ id: 'x', url: 'http://x' }], activeId: null });
  });
});
