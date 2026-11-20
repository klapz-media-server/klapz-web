/**
 * Vite plugin serving artwork under `/artwork`.
 *
 * The Klapz GraphQL API exposes no image fields yet, but each item carries
 * a `plex://<type>/<id>` guid. The Plex metadata provider resolves that guid
 * to poster / background / logo URLs; we then redirect the browser to the
 * Plex image resizer so it only downloads the size it needs.
 *
 *   GET /artwork?guid=plex://movie/xxx&type=poster&w=300&h=450
 *
 * `type` is one of: poster | background | logo | thumb.
 * Unknown guids (local://, missing artwork) answer 404, and the UI falls back
 * to a generated placeholder.
 *
 * The plex.tv token never reaches the browser: it is read from the
 * PLEX_TOKEN env var, or, on Windows, from the local Plex Media Server
 * registry key.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const PROVIDER = 'https://metadata.provider.plex.tv/library/metadata/';
const RESIZER = 'https://images.plex.tv/photo';
const CACHE_FILE = path.resolve('node_modules/.cache/open-web-artwork.json');
const MAX_CONCURRENT = 6;

const TYPE_MAP = {
  poster: ['coverPoster', 'thumb'],
  background: ['background', 'art'],
  logo: ['clearLogo'],
  thumb: ['snapshot', 'thumb', 'coverPoster'],
};

function readToken(envToken) {
  if (envToken) return envToken;
  if (process.platform !== 'win32') return null;
  try {
    const out = execFileSync(
      'reg',
      ['query', 'HKCU\\Software\\Plex, Inc.\\Plex Media Server', '/v', 'PlexOnlineToken'],
      { stdio: ['ignore', 'pipe', 'ignore'] },
    ).toString();
    return out.match(/PlexOnlineToken\s+REG_SZ\s+(\S+)/)?.[1] ?? null;
  } catch {
    return null;
  }
}

function loadCache() {
  try {
    return new Map(Object.entries(JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'))));
  } catch {
    return new Map();
  }
}

export default function artworkPlugin({ token: envToken } = {}) {
  const token = readToken(envToken);
  const cache = loadCache();
  const pending = new Map();
  const queue = [];
  let active = 0;
  let saveTimer = null;

  const scheduleSave = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
        fs.writeFileSync(CACHE_FILE, JSON.stringify(Object.fromEntries(cache)));
      } catch {
        /* cache is best effort */
      }
    }, 2000);
  };

  const runLimited = (task) =>
    new Promise((resolve, reject) => {
      const run = () => {
        active++;
        task()
          .then(resolve, reject)
          .finally(() => {
            active--;
            queue.shift()?.();
          });
      };
      if (active < MAX_CONCURRENT) run();
      else queue.push(run);
    });

  async function fetchImages(id) {
    const res = await fetch(PROVIDER + id, {
      headers: { Accept: 'application/json', 'X-Plex-Token': token },
    });
    if (res.status === 404) return {};
    if (!res.ok) throw new Error(`provider ${res.status}`);
    const json = await res.json();
    const meta = json?.MediaContainer?.Metadata?.[0];
    if (!meta) return {};
    const images = {};
    for (const img of meta.Image ?? []) {
      if (!images[img.type]) images[img.type] = img.url;
    }
    if (meta.thumb) images.thumb = meta.thumb;
    if (meta.art) images.art = meta.art;
    return images;
  }

  function resolve(id) {
    if (cache.has(id)) return Promise.resolve(cache.get(id));
    if (pending.has(id)) return pending.get(id);
    const p = runLimited(() => fetchImages(id))
      .then((images) => {
        cache.set(id, images);
        scheduleSave();
        return images;
      })
      .finally(() => pending.delete(id));
    pending.set(id, p);
    return p;
  }

  async function middleware(req, res, next) {
    if (!req.url.startsWith('/artwork')) return next();
    const url = new URL(req.url, 'http://localhost');
    const guid = url.searchParams.get('guid') ?? '';
    const type = url.searchParams.get('type') ?? 'poster';
    const w = Number(url.searchParams.get('w')) || 400;
    const h = Number(url.searchParams.get('h')) || 600;

    const match = guid.match(/^plex:\/\/(?:movie|show|season|episode)\/([0-9a-f]+)$/i);
    if (!token || !match) {
      res.statusCode = 404;
      return res.end();
    }
    try {
      const images = await resolve(match[1]);
      const source = (TYPE_MAP[type] ?? TYPE_MAP.poster).map((k) => images[k]).find(Boolean);
      if (!source) {
        res.statusCode = 404;
        res.setHeader('Cache-Control', 'public, max-age=3600');
        return res.end();
      }
      const target = new URL(RESIZER);
      target.searchParams.set('width', String(w));
      target.searchParams.set('height', String(h));
      target.searchParams.set('minSize', '1');
      target.searchParams.set('upscale', '1');
      if (type === 'logo') target.searchParams.set('format', 'png');
      target.searchParams.set('url', source);
      res.statusCode = 302;
      res.setHeader('Location', target.toString());
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.end();
    } catch {
      res.statusCode = 502;
      res.end();
    }
  }

  return {
    name: 'open-web-artwork',
    configureServer(server) {
      if (!token) server.config.logger.warn('[artwork] no Plex token found, posters disabled');
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}
