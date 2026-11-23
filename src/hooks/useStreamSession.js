import { useEffect, useRef, useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { START_STREAM, STOP_STREAM } from '../graphql/mutations';
import { serverUrl } from '../servers/serverStore';
import { canDecodeAudio, canDecodeVideo, directPlayMime } from '../utils/capabilities';
import { sendBeacon } from '../utils/gqlBeacon';
import { copyableVideoCodecs, manifestMime } from '../utils/streamProtocol';

const CLIENT_IDENTIFIER = (() => {
  try {
    const stored = localStorage.getItem('open-web.client-id');
    if (stored) return stored;
    const id = crypto.randomUUID();
    localStorage.setItem('open-web.client-id', id);
    return id;
  } catch {
    return 'open-web';
  }
})();

let counter = 0;

const SUBTITLE_FORMATS = ['WEBVTT', 'ASS', 'TTML'];

/**
 * The startStream input for a request, and what the browser will play.
 *
 * `request` is `{ audioId, subtitleId, quality, noDirectPlay, positionMs, protocol }`, where
 * `quality` is 'original' (copy the video when possible), 'auto' (every quality
 * announced, the player choosing among them) or a video bitrate cap in bits per second,
 * and `protocol` is 'DASH' (the default) or 'HLS'.
 */
export function buildStreamInput({ file, version, request, playbackId, key }) {
  const streams = file.streams ?? [];
  const audio = streams.find((s) => s.id === request.audioId) ?? streams.find((s) => s.kind === 'AUDIO');
  const subtitle = request.subtitleId ? streams.find((s) => s.id === request.subtitleId) : null;
  const defaultAudio = streams.find((s) => s.kind === 'AUDIO' && s.isDefault) ?? streams.find((s) => s.kind === 'AUDIO');

  // A browser only plays a file's default audio track, and draws none of its subtitles.
  const mime =
    request.quality === 'original' && !request.noDirectPlay && !subtitle && audio?.id === defaultAudio?.id
      ? directPlayMime(version, audio?.codec)
      : null;

  const protocol = request.protocol === 'HLS' ? 'HLS' : 'DASH';
  const copyable = copyableVideoCodecs(protocol).filter(canDecodeVideo);

  return {
    mime,
    // What Shaka loads the stream's address as: the file's type, or the manifest's.
    loadMime: mime ?? manifestMime(protocol),
    input: {
      file: file.id,
      directPlay: !!mime,
      protocol,
      audioTrack: audio?.id ?? null,
      subtitleTrack: subtitle?.id ?? null,
      subtitles: subtitle ? 'TEXT' : 'NONE',
      // Shaka draws all three: an ASS subtitle stays ASS, any other text comes as WebVTT, and
      // pictures (PGS, DVD, DVB) come as TTML, drawn over the video rather than burned in.
      subtitleFormats: SUBTITLE_FORMATS,
      subtitleScale: 1,
      maxVideoBitrate: typeof request.quality === 'number' ? request.quality : null,
      convertAudio: !!audio && !canDecodeAudio(audio.codec),
      // Sent as they are when the browser decodes them (HEVC in Chrome with a hardware decoder)
      // and the protocol carries them.
      videoCodecs: copyable,
      // Adaptive on the client's side, as a browser player does it: the manifest lists the
      // copy of the video (with its real codec) and every encode, and Shaka chooses by the
      // link. Video that cannot be copied (a codec the browser cannot decode, or that the
      // protocol does not carry) goes the same way: the player plays the encodes.
      quality:
        request.quality === 'auto' || !copyable.includes(version.videoCodec?.toLowerCase())
          ? 'CLIENT_ADAPTIVE'
          : 'FIXED',
      positionMs: Math.max(0, Math.round(request.positionMs ?? 0)),
      key,
      playbackId,
      clientIdentifier: CLIENT_IDENTIFIER,
      clientProduct: 'Klapz Web',
    },
    subtitle,
  };
}

/**
 * Starts a stream of `file` on the server for `request`, restarts it when the
 * request changes, and stops it when the player goes away.
 */
export function useStreamSession({ file, version, request, playbackId }) {
  const client = useApolloClient();
  const [state, setState] = useState({ status: 'idle' });
  const sessionRef = useRef(null);
  const requestKey = JSON.stringify(request);

  useEffect(() => {
    if (!file || !version || !request) return undefined;
    let cancelled = false;
    let started = null;
    const key = `${playbackId}-${++counter}`;
    const { input, loadMime, subtitle } = buildStreamInput({ file, version, request, playbackId, key });
    setState((s) => ({ ...s, status: 'starting', error: null }));

    const stop = (session) =>
      client.mutate({ mutation: STOP_STREAM, variables: { input: { session: session.id } } }).catch(() => {});

    client
      .mutate({ mutation: START_STREAM, variables: { input } })
      .then(({ data }) => {
        const payload = data?.startStream;
        const error = payload?.userErrors?.[0];
        if (cancelled) {
          if (payload?.session) stop(payload.session);
          return;
        }
        if (error || !payload?.stream) {
          setState({ status: 'error', error: error ?? { code: 'UNKNOWN' } });
          return;
        }
        started = payload.session;
        sessionRef.current = payload.session;
        setState({
          status: 'ready',
          // The server hands out paths (`/streams/…?token=…`): on the chosen server.
          stream: {
            ...payload.stream,
            url: serverUrl(payload.stream.url),
            subtitlesUrl: serverUrl(payload.stream.subtitlesUrl),
          },
          session: payload.session,
          mime: loadMime,
          input,
          subtitle,
          startTime: input.positionMs / 1000,
        });
      })
      .catch((e) => {
        if (!cancelled) setState({ status: 'error', error: { code: 'NETWORK', message: e.message } });
      });

    return () => {
      cancelled = true;
      if (started) {
        stop(started);
        if (sessionRef.current === started) sessionRef.current = null;
      }
    };
    // `request` is compared by value through requestKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, file, version, requestKey, playbackId]);

  // Closing the tab skips React's cleanup: stop the stream with a keepalive request.
  useEffect(() => {
    const onHide = () => {
      if (sessionRef.current) sendBeacon(STOP_STREAM, { input: { session: sessionRef.current.id } });
    };
    window.addEventListener('pagehide', onHide);
    return () => window.removeEventListener('pagehide', onHide);
  }, []);

  return state;
}
