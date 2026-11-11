/**
 * What this browser decodes, to tell the server what to convert.
 *
 * `startStream` leaves the decision to the client in three places:
 * `directPlay` (send the file as is), `convertAudio` (the browser cannot
 * take the audio) and `adaptive` (always a re-encode — used when the video
 * codec cannot be decoded).
 */

const VIDEO_CODECS = {
  h264: 'avc1.640028',
  avc: 'avc1.640028',
  hevc: 'hvc1.1.6.L120.90',
  h265: 'hvc1.1.6.L120.90',
  vp9: 'vp09.00.40.08',
  vp8: 'vp8',
  av1: 'av01.0.08M.08',
};

const AUDIO_CODECS = {
  aac: 'mp4a.40.2',
  mp3: 'mp4a.40.34',
  ac3: 'ac-3',
  eac3: 'ec-3',
  opus: 'opus',
  flac: 'flac',
  vorbis: 'vorbis',
};

/** Image subtitles cannot be sent as text: they are burned into the picture. */
const IMAGE_SUBTITLES = new Set(['pgs', 'hdmv_pgs_subtitle', 'vobsub', 'dvd_subtitle', 'dvdsub', 'dvb_subtitle']);

/** Containers a <video> element reads natively. */
const NATIVE_CONTAINERS = { mp4: 'video/mp4', m4v: 'video/mp4', mov: 'video/mp4', webm: 'video/webm' };

const cache = new Map();

function mseSupports(type) {
  if (cache.has(type)) return cache.get(type);
  let ok = false;
  try {
    ok = typeof MediaSource !== 'undefined' && MediaSource.isTypeSupported(type);
  } catch {
    ok = false;
  }
  cache.set(type, ok);
  return ok;
}

export function canDecodeVideo(codec) {
  const id = VIDEO_CODECS[codec?.toLowerCase()];
  return !!id && mseSupports(`video/mp4; codecs="${id}"`);
}

export function canDecodeAudio(codec) {
  const id = AUDIO_CODECS[codec?.toLowerCase()];
  return !!id && mseSupports(`audio/mp4; codecs="${id}"`);
}

export function isImageSubtitle(codec) {
  return IMAGE_SUBTITLES.has(codec?.toLowerCase());
}

/** The MIME type to play the original file with, or null when it cannot be played as is. */
export function directPlayMime(version, audioCodec) {
  const mime = NATIVE_CONTAINERS[version?.container?.toLowerCase()];
  if (!mime) return null;
  if (!canDecodeVideo(version.videoCodec) || !canDecodeAudio(audioCodec ?? version.audioCodec)) return null;
  const probe = document.createElement('video');
  return probe.canPlayType(mime) ? mime : null;
}
