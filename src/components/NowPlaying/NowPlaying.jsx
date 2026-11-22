import { useEffect, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { PLAYBACK_SESSIONS } from '../../graphql/queries';
import { channelsLabel, episodeCode, formatBitrate, formatClock, formatDuration, parseDateTime, resolutionLabel } from '../../utils/format';
import { itemPath } from '../../utils/routes';
import Artwork from '../Artwork/Artwork';
import EmptyState from '../EmptyState/EmptyState';
import ErrorMessage from '../ErrorMessage/ErrorMessage';
import Icon from '../Icon/Icon';
import { useModeLabel } from '../StreamBadge/StreamBadge';
import styles from './NowPlaying.module.css';

/** How often the list is asked again: a session's state, position and arrival show within it. */
const POLL_MS = 5000;

const CODECS = { h264: 'H.264', hevc: 'HEVC', h265: 'HEVC', av1: 'AV1', vp9: 'VP9', mpeg2video: 'MPEG-2', eac3: 'EAC3', ac3: 'AC3', truehd: 'TrueHD', dca: 'DTS', dts: 'DTS', aac: 'AAC', mp3: 'MP3', flac: 'FLAC', opus: 'Opus' };
const codecLabel = (codec) => (codec ? (CODECS[codec.toLowerCase()] ?? codec.toUpperCase()) : null);

/** The clock, ticking each second while something plays: positions move between two polls. */
function useNow(running) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [running]);
  return now;
}

/** The version played: the session does not name it, so the one whose picture it copies, or the first. */
function sourceOf(session) {
  const versions = session.item?.versions ?? [];
  if (session.videoDecision === 'COPY' && session.height) {
    return versions.find((v) => v.height === session.height) ?? versions[0];
  }
  return versions[0];
}

function Track({ label, source, decision, mode, output }) {
  const modeLabel = useModeLabel();
  const { t } = useTranslation();
  return (
    <div className={styles.track}>
      <span className={styles.trackLabel}>{label}</span>
      <div className={styles.trackBody}>
        <span className={styles.trackSource}>{source ?? t('Unknown')}</span>
        <span className={styles.trackDecision} data-decision={decision}>
          <Icon name="chevronRight" size={12} />
          {[decision === 'TRANSCODE' ? output : null, modeLabel(decision === 'TRANSCODE' ? 'TRANSCODE' : mode)].filter(Boolean).join(' — ')}
        </span>
      </div>
    </div>
  );
}

function SessionCard({ session, now }) {
  const { t } = useTranslation();
  const { item } = session;
  const source = sourceOf(session);
  const durationMs = item?.durationMs ?? null;
  const reportedAt = parseDateTime(session.updatedAt)?.getTime();
  const elapsed = session.state === 'PLAYING' && reportedAt ? Math.max(0, now - reportedAt) : 0;
  const positionMs = durationMs ? Math.min(durationMs, session.positionMs + elapsed) : session.positionMs + elapsed;
  const episode = item?.__typename === 'Episode';
  // Without the delivery, a stream copying both tracks reads as direct play.
  const mode = session.videoDecision === 'TRANSCODE' ? 'TRANSCODE' : session.audioDecision === 'TRANSCODE' ? 'DIRECT_STREAM' : 'DIRECT_PLAY';
  const state = { PLAYING: t('Playing'), PAUSED: t('Paused'), BUFFERING: t('Buffering') }[session.state];
  const product = session.clientProduct || t('Unknown player');
  // `1080p (H.264)`, `EAC3 5.1`.
  const resolution = resolutionLabel(source?.width, source?.height);
  const videoCodec = codecLabel(source?.videoCodec);
  const videoSource = resolution && videoCodec ? `${resolution} (${videoCodec})` : resolution || videoCodec;
  const audioSource = [codecLabel(source?.audioCodec), channelsLabel(source?.audioChannels)].filter(Boolean).join(' ') || null;
  const videoOutput = [resolutionLabel(session.width, session.height), formatBitrate(session.videoBitrate && Math.round(session.videoBitrate / 1000))].filter(Boolean).join(' · ');
  const audioOutput = formatBitrate(session.audioBitrate && Math.round(session.audioBitrate / 1000));

  return (
    <article className={styles.card} data-state={session.state}>
      <header className={styles.head}>
        <Link to={item ? itemPath(item) : '#'} className={styles.poster} tabIndex={-1} aria-hidden="true">
          <Artwork guid={episode ? item.show?.guid : item?.guid} title={episode ? item.show?.title : item?.title} placeholderIcon={episode ? 'tv' : 'movie'} />
        </Link>
        <div className={styles.what}>
          {item ? (
            <Link to={itemPath(item)} className={styles.title}>
              {episode ? item.show?.title : item.title}
            </Link>
          ) : (
            <span className={styles.title}>{t('Removed from the library')}</span>
          )}
          <span className={styles.sub}>{episode ? [episodeCode(item.season?.number, item.number), item.title].filter(Boolean).join(' ') : item?.year}</span>
          <span className={styles.sub}>{formatDuration(durationMs)}</span>
        </div>
      </header>

      <div
        className={styles.progress}
        role="progressbar"
        aria-label={t('Position')}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={durationMs ? Math.round((positionMs / durationMs) * 100) : 0}
      >
        <div className={styles.fill} style={{ width: durationMs ? `${(positionMs / durationMs) * 100}%` : 0 }} />
      </div>

      <div className={styles.player}>
        <span className={styles.productIcon} aria-hidden="true">
          {product.charAt(0).toUpperCase()}
        </span>
        <div className={styles.playerText}>
          <span className={styles.product}>{product}</span>
          <span className={styles.state} data-state={session.state}>
            <Icon name={session.state === 'PAUSED' ? 'pause' : 'play'} size={11} />
            {state} — {formatClock(positionMs / 1000)}
            {durationMs ? ` / ${formatClock(durationMs / 1000)}` : ''}
          </span>
          {session.clientIdentifier && (
            <span className={styles.client} title={session.clientIdentifier}>
              {session.clientIdentifier}
            </span>
          )}
        </div>
      </div>

      <div className={styles.tracks}>
        <Track label={t('Video')} source={videoSource} decision={session.videoDecision} mode={mode} output={videoOutput} />
        <Track label={t('Audio')} source={audioSource} decision={session.audioDecision} mode={mode} output={audioOutput} />
      </div>
    </article>
  );
}

/**
 * What is being played on the server right now, for its owners: one card per session,
 * with where it stands and what the server does to each track. Asked again every few
 * seconds while the page is visible.
 */
export default function NowPlaying() {
  const { t } = useTranslation();
  const { data, previousData, error, refetch } = useQuery(PLAYBACK_SESSIONS, {
    pollInterval: POLL_MS,
    fetchPolicy: 'network-only',
    nextFetchPolicy: 'network-only',
    notifyOnNetworkStatusChange: false,
    skipPollAttempt: () => document.visibilityState === 'hidden',
  });
  const sessions = (data ?? previousData)?.playbackSessions.edges.map((e) => e.node) ?? null;
  const now = useNow(!!sessions?.some((s) => s.state === 'PLAYING'));

  return (
    <section aria-labelledby="now-playing">
      <h2 id="now-playing" className={styles.heading}>
        {t('Now playing')}
        {sessions?.length > 0 && <span className={styles.count}>{sessions.length}</span>}
      </h2>
      {error && !sessions ? (
        <ErrorMessage error={error} onRetry={() => refetch()} />
      ) : !sessions ? (
        <div className={styles.grid} aria-busy="true">
          <div className={styles.skeleton} />
        </div>
      ) : sessions.length === 0 ? (
        <EmptyState
          variant="compact"
          icon="play"
          title={t('Nothing is being played right now')}
          description={t('What your users watch appears here as soon as they start.')}
        />
      ) : (
        <div className={styles.grid}>
          {sessions.map((session) => (
            <SessionCard key={session.id} session={session} now={now} />
          ))}
        </div>
      )}
    </section>
  );
}
