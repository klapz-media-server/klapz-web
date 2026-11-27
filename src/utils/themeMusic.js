/**
 * A series' theme music, played behind its pages as Plex Web plays it: once, at a moderate
 * volume, faded in, faded out when the viewer leaves the series, cut short by a playback.
 *
 * One player for the whole app, outside React like `serverStore`: a page *claims* the series it
 * shows (`claimTheme`), then hands it the theme once known (`playTheme`), and *releases* it when
 * it goes (`releaseTheme`). A release waits a moment before fading out, so that moving between
 * the same series' pages — a new route, a new mount — finds the theme still playing and keeps
 * it, where another series' claim replaces it at once.
 *
 * Whether to play at all is a choice of this browser, on by default.
 */

const KEY = 'open-web.theme-music';

export const THEME_VOLUME = 0.3;
const FADE_IN_MS = 1500;
const FADE_OUT_MS = 1000;
const FADE_STEP_MS = 50;
/** How long a released series keeps its theme, for the next page of the same series to claim it. */
const RELEASE_GRACE_MS = 400;

// --- The preference -------------------------------------------------------------------------

function readEnabled() {
  try {
    return localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
}

let enabled = readEnabled();
const listeners = new Set();

export function subscribeThemeMusic(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isThemeMusicEnabled() {
  return enabled;
}

/** Turned off, a theme playing stops at once. */
export function setThemeMusicEnabled(next) {
  enabled = !!next;
  try {
    localStorage.setItem(KEY, enabled ? 'on' : 'off');
  } catch {
    /* private mode: the choice lasts for this page only */
  }
  if (!enabled) stopThemeMusic();
  for (const listener of listeners) listener();
}

// --- The player -----------------------------------------------------------------------------

/** The series claimed, its theme's address once given, the element playing it. */
let current = { showId: null, url: null, audio: null };
let releaseTimer = null;
const fades = new WeakMap();

function cancelFade(audio) {
  clearInterval(fades.get(audio));
  fades.delete(audio);
}

/** Moves `audio`'s volume to `target` over `ms`, then calls `done`. */
function fade(audio, target, ms, done) {
  cancelFade(audio);
  const start = audio.volume;
  const steps = Math.max(1, Math.round(ms / FADE_STEP_MS));
  let step = 0;
  const timer = setInterval(() => {
    step += 1;
    try {
      audio.volume = start + ((target - start) * step) / steps;
    } catch {
      /* a volume the platform keeps to itself (iOS): the fade is only a nicety */
    }
    if (step >= steps) {
      cancelFade(audio);
      done?.();
    }
  }, FADE_STEP_MS);
  fades.set(audio, timer);
}

function silence(audio) {
  cancelFade(audio);
  audio.pause();
  audio.removeAttribute('src');
  audio.load();
}

function fadeOut(audio) {
  if (!audio) return;
  if (audio.paused) silence(audio);
  else fade(audio, 0, FADE_OUT_MS, () => silence(audio));
}

function clearRelease() {
  clearTimeout(releaseTimer);
  releaseTimer = null;
}

/** The page of `showId` is shown: another series' theme fades out, the same one's carries on. */
export function claimTheme(showId) {
  if (!showId) return;
  if (current.showId === showId) {
    clearRelease();
    return;
  }
  clearRelease();
  fadeOut(current.audio);
  current = { showId, url: null, audio: null };
}

/** `url`, the theme of the series claimed, plays once unless it already is (or did). */
export function playTheme(showId, url) {
  if (!enabled || !url || current.showId !== showId || current.url === url) return;
  fadeOut(current.audio);
  const audio = new Audio();
  audio.preload = 'auto';
  audio.volume = 0;
  audio.src = url;
  current = { showId, url, audio };
  audio.addEventListener('ended', () => silence(audio), { once: true });
  // Refused by the browser's autoplay policy, or unreadable: the page stays as it is.
  audio.play().then(
    () => {
      if (current.audio === audio) fade(audio, THEME_VOLUME, FADE_IN_MS);
    },
    () => {
      if (current.audio === audio) current = { ...current, audio: null };
    },
  );
}

/** The page of `showId` is gone: unless another page of it claims it shortly, its theme fades out. */
export function releaseTheme(showId) {
  if (current.showId !== showId) return;
  clearRelease();
  releaseTimer = setTimeout(() => {
    releaseTimer = null;
    if (current.showId !== showId) return;
    fadeOut(current.audio);
    current = { showId: null, url: null, audio: null };
  }, RELEASE_GRACE_MS);
}

/** Stops the theme at once, as a video playback starting does. */
export function stopThemeMusic() {
  clearRelease();
  if (current.audio) silence(current.audio);
  current = { showId: null, url: null, audio: null };
}
