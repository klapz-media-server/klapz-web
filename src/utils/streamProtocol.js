/**
 * How a converted stream is cut up, a choice of this browser: 'DASH' (fragmented MP4, the
 * default) or 'HLS' (MPEG-TS). The server copies H.264, HEVC, VP9 and AV1 over DASH but only
 * H.264 over HLS. Text subtitles come whole beside either: listed in a DASH manifest, loaded apart
 * over HLS.
 */

export const STREAM_PROTOCOLS = ['DASH', 'HLS'];
export const DEFAULT_STREAM_PROTOCOL = 'DASH';

const KEY = 'open-web.stream-protocol';

export function getStreamProtocol() {
  try {
    const stored = localStorage.getItem(KEY);
    return STREAM_PROTOCOLS.includes(stored) ? stored : DEFAULT_STREAM_PROTOCOL;
  } catch {
    return DEFAULT_STREAM_PROTOCOL;
  }
}

export function setStreamProtocol(protocol) {
  if (!STREAM_PROTOCOLS.includes(protocol)) return;
  try {
    localStorage.setItem(KEY, protocol);
  } catch {
    /* private mode: the choice lasts for this page only */
  }
}

/** The video codecs the server sends as they are over `protocol`, as `MediaStream.codec` names them. */
export function copyableVideoCodecs(protocol) {
  return protocol === 'HLS' ? ['h264'] : ['h264', 'hevc', 'vp9', 'av1'];
}

/** The MIME type Shaka loads a manifest of `protocol` as. */
export function manifestMime(protocol) {
  return protocol === 'HLS' ? 'application/x-mpegurl' : 'application/dash+xml';
}
