import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { useTranslation } from 'react-i18next';
import { REPORT_PLAYBACK, REPORT_VIEWING } from '../../graphql/mutations';
import { defaultAudioId, defaultSubtitleId, useServerTrackOptions } from '../../hooks/useServerTrackOptions';
import { useStreamSession } from '../../hooks/useStreamSession';
import { directPlayMime } from '../../utils/capabilities';
import { languageLabel } from '../../utils/format';
import { sendBeacon } from '../../utils/gqlBeacon';
import { decisionFromStream } from '../../utils/playback';
import { getStreamProtocol } from '../../utils/streamProtocol';
import VideoPlayer from '../VideoPlayer/VideoPlayer';

/** What Shaka loads a subtitle served apart as, by the format the server sent it in. */
const SUBTITLE_MIME = { WEBVTT: 'text/vtt', ASS: 'text/x-ssa', SRT: 'text/srt', TTML: 'application/ttml+xml' };

/**
 * Real playback of an item's file: starts a stream on the server
 * (`startStream`), restarts it at the current position when the audio, the
 * quality or a subtitle it does not serve changes, reports the position (`reportPlayback`, `reportViewing`)
 * and stops it on the way out (`stopStream`).
 */
export default function StreamPlayer({ item, version, file, title, subtitle, posterItem, onBack, startMs = 0 }) {
  const { t } = useTranslation();
  const client = useApolloClient();
  const [playbackId] = useState(() => `open-web-${crypto.randomUUID()}`);
  const positionRef = useRef(startMs / 1000);
  const lastReport = useRef(null);

  const streams = file.streams ?? [];
  const [request, setRequest] = useState(() => {
    const audioId = defaultAudioId(streams);
    const audio = streams.find((s) => s.id === audioId);
    return {
      audioId,
      subtitleId: defaultSubtitleId(streams, audioId),
      // The file as is when the browser plays it; otherwise every quality, the player
      // choosing by the link — the copy of the video first when the file allows it.
      quality: directPlayMime(version, audio?.codec) ? 'original' : 'auto',
      noDirectPlay: false,
      positionMs: startMs,
      // DASH or HLS, as chosen in the settings; read once per playback.
      protocol: getStreamProtocol(),
    };
  });

  const session = useStreamSession({ file, version, request, playbackId });
  const stream = session.stream;

  // The subtitle shown, which a new stream starts with.
  const [subtitleId, setSubtitleId] = useState(request.subtitleId);
  const subtitleRef = useRef(subtitleId);
  subtitleRef.current = subtitleId;

  const change = useCallback((patch) => {
    if ('subtitleId' in patch) setSubtitleId(patch.subtitleId);
    setRequest((r) => ({
      ...r,
      subtitleId: subtitleRef.current,
      ...patch,
      positionMs: Math.round(positionRef.current * 1000),
    }));
  }, []);

  // A track the conversion serves beside it, or none, is switched in the player; any other
  // (a sidecar, or any track during direct play) takes a new stream.
  const startedSubtitleId = session.subtitle?.id ?? null;
  const chooseSubtitle = useCallback(
    (id) => {
      const served =
        !!stream &&
        stream.delivery !== 'DIRECT_PLAY' &&
        (id === null || id === startedSubtitleId || stream.subtitleFiles?.some((f) => f.track === id));
      if (served) setSubtitleId(id);
      else change({ subtitleId: id });
    },
    [stream, startedSubtitleId, change],
  );
  const onTrackChange = useCallback(
    (patch) => ('subtitleId' in patch ? chooseSubtitle(patch.subtitleId) : change(patch)),
    [chooseSubtitle, change],
  );

  const canDirectPlay = !!directPlayMime(version);
  const serverOptions = useServerTrackOptions({
    file,
    version,
    request: { ...request, subtitleId },
    onChange: onTrackChange,
    canDirectPlay,
  });
  // The qualities of an adaptive stream are the player's to choose: VideoPlayer lists them.
  const adaptive = session.input?.quality === 'CLIENT_ADAPTIVE' && stream?.delivery !== 'DIRECT_PLAY';
  const trackOptions = useMemo(() => ({ ...serverOptions, adaptive }), [serverOptions, adaptive]);

  // ---- reports
  const report = useCallback(
    ({ state, positionMs, durationMs }) => {
      lastReport.current = { positionMs, durationMs };
      client.mutate({ mutation: REPORT_PLAYBACK, variables: { input: { playbackId, state, positionMs } } }).catch(() => {});
      client
        .mutate({
          mutation: REPORT_VIEWING,
          variables: { input: { itemId: item.id, playbackId, positionMs, durationMs } },
          update(cache, { data }) {
            const watchState = data?.reportViewing?.state;
            if (!watchState) return;
            cache.modify({
              id: cache.identify(item),
              fields: { watchState: (existing) => ({ ...existing, ...watchState }) },
            });
          },
        })
        .catch(() => {});
    },
    [client, item, playbackId],
  );

  // Last word when leaving: the position, then the end of the playback.
  useEffect(() => {
    const finish = () => {
      // Nothing played yet (or React's double mount in development): nothing to close.
      const last = lastReport.current;
      if (!last) return;
      lastReport.current = null;
      const positionMs = Math.round(positionRef.current * 1000);
      sendBeacon(REPORT_VIEWING, { input: { itemId: item.id, playbackId, positionMs, durationMs: last.durationMs } });
      sendBeacon(REPORT_PLAYBACK, { input: { playbackId, state: 'STOPPED', positionMs } });
    };
    window.addEventListener('pagehide', finish);
    return () => {
      window.removeEventListener('pagehide', finish);
      finish();
    };
  }, [item.id, playbackId]);

  // ---- what VideoPlayer loads
  const subtitleStream = streams.find((s) => s.id === subtitleId) ?? null;
  const textTrack = useMemo(() => {
    if (!stream || !subtitleStream) return null;
    const language = subtitleStream.language;
    const label = subtitleStream.title || languageLabel(language);
    // The one the stream started with: a DASH manifest lists it, over HLS it is loaded apart.
    if (subtitleStream.id === startedSubtitleId && stream.subtitlesUrl) {
      const url = stream.protocol === 'DASH' ? null : stream.subtitlesUrl;
      return { url, mimeType: SUBTITLE_MIME[stream.subtitleFormat], language, label };
    }
    const served = stream.subtitleFiles?.find((f) => f.track === subtitleStream.id);
    return served ? { url: served.url, mimeType: SUBTITLE_MIME[served.format], language, label } : null;
  }, [stream, subtitleStream, startedSubtitleId]);

  // Subtitles the server cannot deliver (a teletext track, say) must not stop
  // the film: it plays on without them. A forced track is chosen by default, so this is common.
  const refusedSubtitle = session.status === 'error' && session.error?.code === 'SUBTITLE_NOT_DELIVERABLE';

  const errorMessages = {
    FILE_MISSING: t('This file is not available on this server.'),
    FILE_NOT_FOUND: t('This file no longer exists.'),
    TRACK_NOT_FOUND: t('This track is not available.'),
    VIDEO_NOT_CONVERTIBLE: t('The server cannot convert this video.'),
    SUBTITLE_NOT_DELIVERABLE: t('These subtitles cannot be shown.'),
    TOO_MANY_STREAMS: t('Too many streams are running on the server.'),
    NOT_ANALYZED: t('The server has not been able to read this file yet. Try again in a moment.'),
  };
  const error =
    session.status === 'error' && !(refusedSubtitle && request.subtitleId)
      ? {
          title: t('Playback failed'),
          detail: errorMessages[session.error?.code] ?? session.error?.message ?? null,
        }
      : null;

  useEffect(() => {
    if (refusedSubtitle && request.subtitleId) change({ subtitleId: null });
  }, [refusedSubtitle, request.subtitleId, change]);

  // A file the browser turns down in direct play is streamed instead.
  const onPlayerError = useCallback(() => {
    if (stream?.delivery === 'DIRECT_PLAY' && !request.noDirectPlay) change({ noDirectPlay: true });
  }, [stream?.delivery, request.noDirectPlay, change]);

  return (
    <VideoPlayer
      src={stream?.url ?? null}
      startTime={session.startTime}
      mimeType={session.mime}
      textTrack={textTrack}
      title={title}
      subtitle={subtitle}
      posterItem={posterItem}
      onBack={onBack}
      decision={decisionFromStream(stream, subtitleStream)}
      source={version}
      trackOptions={trackOptions}
      preparing={session.status === 'starting'}
      error={error}
      onPlaybackState={report}
      onPlayerError={onPlayerError}
      positionRef={positionRef}
      durationHintMs={version.durationMs ?? item.durationMs}
    />
  );
}
