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
import VideoPlayer from '../VideoPlayer/VideoPlayer';

/**
 * Real playback of an item's file: starts a stream on the server
 * (`startStream`), restarts it at the current position when a track or the
 * quality changes, reports the position (`reportPlayback`, `reportViewing`)
 * and stops it on the way out (`stopStream`).
 */
export default function StreamPlayer({ item, version, file, title, subtitle, posterGuid, onBack, startMs = 0 }) {
  const { t } = useTranslation();
  const client = useApolloClient();
  const [playbackId] = useState(() => `open-web-${crypto.randomUUID()}`);
  const positionRef = useRef(startMs / 1000);
  const lastReport = useRef(null);

  const streams = file.streams ?? [];
  const [request, setRequest] = useState(() => {
    const audioId = defaultAudioId(streams);
    return {
      audioId,
      subtitleId: defaultSubtitleId(streams, audioId),
      quality: 'original',
      noDirectPlay: false,
      positionMs: startMs,
    };
  });

  const session = useStreamSession({ file, version, request, playbackId });
  const stream = session.stream;

  const change = useCallback(
    (patch) => setRequest((r) => ({ ...r, ...patch, positionMs: Math.round(positionRef.current * 1000) })),
    [],
  );

  const canDirectPlay = !!directPlayMime(version);
  const trackOptions = useServerTrackOptions({ file, version, request, onChange: change, canDirectPlay });

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
  const subtitleStream = session.subtitle;
  const textTrack = useMemo(
    () =>
      stream?.subtitlesUrl
        ? {
            url: stream.subtitlesUrl,
            language: subtitleStream?.language,
            label: subtitleStream?.title || languageLabel(subtitleStream?.language),
          }
        : null,
    [stream?.subtitlesUrl, subtitleStream],
  );

  const errorMessages = {
    FILE_MISSING: t('This file is not available on this server.'),
    FILE_NOT_FOUND: t('This file no longer exists.'),
    TRACK_NOT_FOUND: t('This track is not available.'),
    VIDEO_NOT_CONVERTIBLE: t('The server cannot convert this video.'),
    SUBTITLE_NOT_DELIVERABLE: t('These subtitles cannot be shown.'),
    TOO_MANY_STREAMS: t('Too many streams are running on the server.'),
  };
  const error =
    session.status === 'error'
      ? {
          title: t('Playback failed'),
          detail: errorMessages[session.error?.code] ?? session.error?.message ?? null,
        }
      : null;

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
      posterGuid={posterGuid}
      onBack={onBack}
      decision={decisionFromStream(stream)}
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
