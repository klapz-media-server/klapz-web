import { serverUrl } from '../servers/serverStore';
import { blurHashDataUrl } from './blurhash';

/**
 * Artwork URLs. An item's own images come from the server it was read from (`images`, served
 * at `/artwork/…`), scaled to the size asked by its image transcoder (`/photo/:/transcode`);
 * an item the server has none for but whose guid is Plex's falls back on the `/artwork`
 * dev-server endpoint (see server/artworkPlugin.js). Sizes are doubled for HiDPI screens.
 */
const BASE = import.meta.env.VITE_ARTWORK_URL || '/artwork';

const SIZES = {
  poster: [240, 360],
  posterLarge: [400, 600],
  background: [1920, 1080],
  backgroundSmall: [96, 54],
  logo: [800, 300],
  thumb: [480, 270],
};

/** The server's kinds of image for each type asked, best first: an episode's thumb is its still. */
const KINDS = {
  poster: ['POSTER'],
  posterLarge: ['POSTER'],
  background: ['BACKGROUND'],
  logo: ['CLEAR_LOGO'],
  thumb: ['THUMB', 'POSTER'],
};

/** `source` as a list of items or guids, an item's own first then its fallbacks. */
function candidates(source) {
  return (Array.isArray(source) ? source : [source]).filter(Boolean);
}

/**
 * The image of `type` that `source` — an item, or a list of items tried in order (a season,
 * then its series) — has on its server, or null.
 */
export function imageFor(source, type = 'poster') {
  const kinds = KINDS[type] ?? KINDS.poster;
  for (const item of candidates(source)) {
    if (typeof item !== 'object') continue;
    for (const kind of kinds) {
      const image = item.images?.find((candidate) => candidate.kind === kind);
      if (image) return image;
    }
  }
  return null;
}

/** A data URL of the blurred preview to show while `source`'s image of `type` loads. */
export function previewFor(source, type = 'poster') {
  return blurHashDataUrl(imageFor(source, type)?.blurHash);
}

export function artworkUrl(source, type = 'poster', size = type) {
  const [w, h] = SIZES[size] ?? SIZES.poster;
  const image = imageFor(source, type);
  if (image) {
    // The image's own address serves it as stored; a scaled copy is the image transcoder's.
    const scale = new URLSearchParams({ url: image.url, width: String(w), height: String(h) });
    return serverUrl(`/photo/:/transcode?${scale}`);
  }
  const guid = candidates(source)
    .map((item) => (typeof item === 'string' ? item : item.guid))
    .find((candidate) => candidate?.startsWith('plex://'));
  if (!guid) return null;
  const apiType = type === 'posterLarge' ? 'poster' : type;
  const params = new URLSearchParams({ guid, type: apiType, w: String(w), h: String(h) });
  return `${BASE}?${params}`;
}

/** Deterministic hue from a string, for placeholders. */
export function hueFromString(str = '') {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(hash) % 360;
}
