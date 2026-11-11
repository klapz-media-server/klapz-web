/**
 * Builds artwork URLs served by the `/artwork` dev-server endpoint
 * (see server/artworkPlugin.js). Sizes are doubled for HiDPI screens.
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

export function artworkUrl(guid, type = 'poster', size = type) {
  if (!guid || !guid.startsWith('plex://')) return null;
  const [w, h] = SIZES[size] ?? SIZES.poster;
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
