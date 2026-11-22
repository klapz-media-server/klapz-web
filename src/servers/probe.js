/**
 * Finding a Klapz server from what a user types: an IP, a domain, with or without a port,
 * a scheme or a path (`192.168.1.10`, `media.example.com:8443`, `https://example.com/klapz`).
 */

export const DEFAULT_PORT = 32500;
const PROBE_TIMEOUT_MS = 5000;
const SERVER_QUERY = 'query ServerProbe { server { machineIdentifier friendlyName version } }';

/**
 * The addresses to try, best first. A scheme or a port typed is kept; otherwise HTTPS then
 * HTTP on their usual ports (443, 80), then Klapz's own port (32500). Null when the input
 * is no address at all. A page served over HTTPS cannot call an HTTP address (mixed
 * content): those are left out when `secureOnly`.
 */
export function candidateUrls(input, { secureOnly = false } = {}) {
  const text = String(input ?? '').trim();
  if (!text || /\s/.test(text)) return null;
  const schemeMatch = /^([a-z][a-z\d+.-]*):\/\//i.exec(text);
  const scheme = schemeMatch?.[1].toLowerCase();
  if (scheme && scheme !== 'http' && scheme !== 'https') return null;

  let parsed;
  try {
    parsed = new URL(scheme ? text : `http://${text}`);
  } catch {
    return null;
  }
  if (!parsed.hostname || parsed.username || parsed.password) return null;
  const host = parsed.hostname;
  const path = parsed.pathname.replace(/\/+$/, '');
  // `new URL` drops a port that is the scheme's default: read it from the text instead.
  const portMatch = /^(?:[a-z]+:\/\/)?(?:\[[^\]]+\]|[^/:?#]+):(\d+)/i.exec(text);
  const port = portMatch ? Number(portMatch[1]) : null;
  if (port !== null && (port < 1 || port > 65535)) return null;

  const build = (proto, p) => {
    const isDefault = (proto === 'https' && p === 443) || (proto === 'http' && p === 80) || p === null;
    return `${proto}://${host}${isDefault ? '' : `:${p}`}${path}`;
  };

  let candidates;
  if (scheme && port !== null) candidates = [build(scheme, port)];
  else if (scheme) candidates = [build(scheme, null), build(scheme, DEFAULT_PORT)];
  else if (port !== null) candidates = [build('https', port), build('http', port)];
  else candidates = [build('https', 443), build('http', 80), build('http', DEFAULT_PORT), build('https', DEFAULT_PORT)];

  candidates = [...new Set(candidates)];
  return secureOnly ? candidates.filter((url) => url.startsWith('https:')) : candidates;
}

function withTimeout(signal, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort, { once: true });
  return {
    signal: controller.signal,
    done: () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    },
  };
}

/**
 * Asks `url` whether it is a Klapz server. Resolves to one of:
 * - `{ status: 'online', server: { machineIdentifier, friendlyName, version } }`
 * - `{ status: 'blocked' }`: something answers, but the browser hides its answer from this
 *   page (the server does not allow this page's origin);
 * - `{ status: 'invalid' }`: something answers, but not as a Klapz server;
 * - `{ status: 'offline' }`: nothing answers in time.
 */
export async function probeUrl(url, { signal, timeout = PROBE_TIMEOUT_MS } = {}) {
  const attempt = withTimeout(signal, timeout);
  try {
    const response = await fetch(`${url}/graphql`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: SERVER_QUERY }),
      signal: attempt.signal,
    });
    const body = await response.json().catch(() => null);
    const server = body?.data?.server;
    if (server?.machineIdentifier) return { status: 'online', server };
    return { status: 'invalid' };
  } catch {
    if (signal?.aborted) return { status: 'offline' };
  } finally {
    attempt.done();
  }

  // A refused cross-origin answer looks like no answer at all. An opaque request tells the
  // two apart: it succeeds whenever anything answers.
  const opaque = withTimeout(signal, timeout);
  try {
    await fetch(`${url}/graphql`, { mode: 'no-cors', credentials: 'omit', signal: opaque.signal });
    return { status: 'blocked' };
  } catch {
    return { status: 'offline' };
  } finally {
    opaque.done();
  }
}

/** What matters most in a failed search, to explain it. */
const FAILURE_ORDER = ['blocked', 'invalid', 'offline'];

/**
 * Tries every candidate address at once and keeps the best one that answers as a Klapz
 * server (in the candidates' order, not the fastest). `onProgress(url, result)` follows
 * each attempt; `result` is null while it runs.
 *
 * Resolves to `{ ok: true, url, server }` or `{ ok: false, code }`, `code` being `INVALID_ADDRESS`,
 * `INSECURE` (only HTTP addresses, from an HTTPS page), or the best failure seen
 * (`blocked`, `invalid`, `offline`).
 */
export async function findServer(input, { signal, onProgress, secureOnly } = {}) {
  const secure = secureOnly ?? (typeof window !== 'undefined' && window.location.protocol === 'https:');
  const all = candidateUrls(input);
  if (!all) return { ok: false, code: 'INVALID_ADDRESS' };
  const candidates = secure ? all.filter((url) => url.startsWith('https:')) : all;
  if (candidates.length === 0) return { ok: false, code: 'INSECURE' };

  candidates.forEach((url) => onProgress?.(url, null));
  const results = await Promise.all(
    candidates.map(async (url) => {
      const result = await probeUrl(url, { signal });
      onProgress?.(url, result);
      return { url, ...result };
    }),
  );
  const found = results.find((r) => r.status === 'online');
  if (found) return { ok: true, url: found.url, server: found.server };
  const code = FAILURE_ORDER.find((status) => results.some((r) => r.status === status)) ?? 'offline';
  return { ok: false, code };
}
