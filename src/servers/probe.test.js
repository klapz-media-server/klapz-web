import { afterEach, describe, expect, it, vi } from 'vitest';
import { candidateUrls, findServer } from './probe';

describe('candidateUrls', () => {
  it('tries HTTPS, HTTP, then the Klapz port for a bare host', () => {
    expect(candidateUrls('192.168.1.10')).toEqual([
      'https://192.168.1.10',
      'http://192.168.1.10',
      'http://192.168.1.10:32500',
      'https://192.168.1.10:32500',
    ]);
    expect(candidateUrls(' Media.Example.com ')).toEqual([
      'https://media.example.com',
      'http://media.example.com',
      'http://media.example.com:32500',
      'https://media.example.com:32500',
    ]);
  });

  it('keeps a port typed, on both schemes', () => {
    expect(candidateUrls('nas.local:8443')).toEqual(['https://nas.local:8443', 'http://nas.local:8443']);
    expect(candidateUrls('host:443')).toEqual(['https://host', 'http://host:443']);
    expect(candidateUrls('host:80')).toEqual(['https://host:80', 'http://host']);
  });

  it('keeps a scheme typed', () => {
    expect(candidateUrls('https://example.com')).toEqual(['https://example.com', 'https://example.com:32500']);
    expect(candidateUrls('http://example.com:32500/')).toEqual(['http://example.com:32500']);
  });

  it('keeps a path, for a server behind a reverse proxy', () => {
    expect(candidateUrls('https://example.com/klapz/')).toEqual([
      'https://example.com/klapz',
      'https://example.com:32500/klapz',
    ]);
  });

  it('reads IPv6 addresses', () => {
    expect(candidateUrls('[::1]:32500')).toEqual(['https://[::1]:32500', 'http://[::1]:32500']);
  });

  it('refuses what is no address', () => {
    for (const bad of ['', '   ', 'two words', 'ftp://example.com', 'user:pass@host', 'host:99999', 'http://']) {
      expect(candidateUrls(bad), bad).toBeNull();
    }
  });

  it('leaves out HTTP addresses from an HTTPS page', () => {
    expect(candidateUrls('host', { secureOnly: true })).toEqual(['https://host', 'https://host:32500']);
  });
});

describe('findServer', () => {
  afterEach(() => vi.unstubAllGlobals());

  const server = { machineIdentifier: 'abc', friendlyName: 'Salon', version: '1.0' };

  it('keeps the best address that answers, not the fastest', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url, init) => {
        if (init?.mode === 'no-cors') throw new TypeError('down');
        if (url.startsWith('https://host/') || url.startsWith('http://host/')) throw new TypeError('down');
        return new Response(JSON.stringify({ data: { server } }));
      }),
    );
    const progress = [];
    const found = await findServer('host', { secureOnly: false, onProgress: (url, r) => progress.push([url, r?.status ?? null]) });
    expect(found).toEqual({ ok: true, url: 'http://host:32500', server });
    expect(progress.filter(([, s]) => s === null)).toHaveLength(4);
  });

  it('tells a refused origin from a server that is down', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url, init) => {
        if (init?.mode === 'no-cors' && url.startsWith('http://host:32500')) return new Response(null);
        throw new TypeError('failed');
      }),
    );
    expect(await findServer('host', { secureOnly: false })).toEqual({ ok: false, code: 'blocked' });
  });

  it('reports an HTTP-only address from an HTTPS page', async () => {
    expect(await findServer('http://host', { secureOnly: true })).toEqual({ ok: false, code: 'INSECURE' });
    expect(await findServer('not an address')).toEqual({ ok: false, code: 'INVALID_ADDRESS' });
  });
});
