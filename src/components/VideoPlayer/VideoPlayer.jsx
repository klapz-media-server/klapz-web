import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFullscreen } from '../../hooks/useFullscreen';
import { useIdle } from '../../hooks/useIdle';
import { useMediaState } from '../../hooks/useMediaState';
import { useShakaPlayer } from '../../hooks/useShakaPlayer';
import { useShakaTrackOptions } from '../../hooks/useShakaTrackOptions';
import { artworkUrl } from '../../utils/artwork';
import { formatClock } from '../../utils/format';
import { stopThemeMusic } from '../../utils/themeMusic';
import { withManifestDelivery } from '../../utils/playback';
import Icon from '../Icon/Icon';
import PlayerFeedback from '../PlayerFeedback/PlayerFeedback';
import PlayerIconButton from '../PlayerIconButton/PlayerIconButton';
import PlayerSettings from '../PlayerSettings/PlayerSettings';
import SeekBar from '../SeekBar/SeekBar';
import VolumeControl from '../VolumeControl/VolumeControl';
import styles from './VideoPlayer.module.css';

const SKIP_BACK = 10;
const SKIP_FORWARD = 30;

const isTyping = (el) => el && (/^(input|textarea|select)$/i.test(el.tagName) || el.isContentEditable);

const REPORT_INTERVAL = 10000;

/**
 * The caller's options, with an adaptive stream's qualities — the ones in its manifest —
 * under "Auto": picking one pins it in the player, without restarting the stream.
 */
function withPlayerQualities(trackOptions, shakaOptions, shakaState) {
  if (!trackOptions) return shakaOptions;
  if (!trackOptions.adaptive || shakaState.tracks.video.length === 0) return trackOptions;
  const [auto, ...rungs] = shakaOptions.quality;
  return {
    ...trackOptions,
    quality: trackOptions.quality.flatMap((option) =>
      option.key === 'auto'
        ? [{ ...option, detail: auto.detail ?? option.detail, selected: shakaState.abr, onSelect: auto.onSelect }, ...rungs]
        : [option],
    ),
  };
}

/**
 * Full-viewport video player on Shaka Player, with a custom UI in the
 * style of the Plex web player.
 *
 * - `src`, `startTime`, `mimeType`, `textTrack`: what to load (a change of
 *   `src` reloads in place, keeping fullscreen and volume).
 * - `trackOptions` `{ audio, text, quality }`: settings options built by the
 *   caller (server tracks); Shaka's own tracks are listed when left out.
 * - `preparing`: the caller is (re)starting the stream; `error`: it failed.
 * - `onPlaybackState({ state, positionMs, durationMs })`: on play / pause /
 *   buffering and every 10 s; `positionRef` holds the current time.
 */
export default function VideoPlayer({
  src,
  startTime,
  mimeType,
  textTrack,
  title,
  subtitle,
  posterItem,
  onBack,
  decision: startDecision,
  source,
  trackOptions,
  preparing = false,
  error: streamError,
  onPlaybackState,
  onPlayerError,
  positionRef,
  durationHintMs,
}) {
  const { t } = useTranslation();
  const rootRef = useRef(null);
  const videoRef = useRef(null);
  const captionsRef = useRef(null);
  const media = useMediaState(videoRef);
  const shakaState = useShakaPlayer(videoRef, src, captionsRef, { startTime, mimeType, textTrack });
  const shakaOptions = useShakaTrackOptions(shakaState);
  const options = withPlayerQualities(trackOptions, shakaOptions, shakaState);
  const decision = withManifestDelivery(startDecision, shakaState.activeDelivery);
  const [fullscreen, toggleFullscreen] = useFullscreen(rootRef);
  const [settingsTab, setSettingsTab] = useState(null);
  const [scrubbing, setScrubbing] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [showRemaining, setShowRemaining] = useState(true);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [live, setLive] = useState(null);
  const feedbackId = useRef(0);

  const keepAwake = media.paused || !!settingsTab || scrubbing || !media.started;
  const [idle] = useIdle(rootRef, { delay: 3000, enabled: !keepAwake });

  // Live stats, refreshed every second while the Info tab is open.
  const { getLiveInfo } = shakaState;
  useEffect(() => {
    if (settingsTab !== 'info') return undefined;
    const tick = () => setLive(getLiveInfo());
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [settingsTab, getLiveInfo]);

  // Position and state for the caller's reports.
  const playbackState = media.waiting && !media.paused ? 'BUFFERING' : media.paused ? 'PAUSED' : 'PLAYING';
  const reportRef = useRef(onPlaybackState);
  reportRef.current = onPlaybackState;
  const snapshotRef = useRef(null);
  snapshotRef.current = {
    state: playbackState,
    positionMs: Math.round(media.currentTime * 1000),
    durationMs: Math.round(media.duration * 1000) || durationHintMs || null,
  };
  if (positionRef) positionRef.current = media.currentTime;
  useEffect(() => {
    if (!media.started) return undefined;
    reportRef.current?.(snapshotRef.current);
    if (playbackState !== 'PLAYING') return undefined;
    const timer = setInterval(() => reportRef.current?.(snapshotRef.current), REPORT_INTERVAL);
    return () => clearInterval(timer);
  }, [playbackState, media.started]);

  const flash = useCallback((icon, text, side) => {
    feedbackId.current += 1;
    setFeedback({ id: feedbackId.current, icon, text, side });
  }, []);

  const errorRef = useRef(onPlayerError);
  errorRef.current = onPlayerError;
  useEffect(() => {
    if (shakaState.status === 'error') errorRef.current?.(shakaState.error);
  }, [shakaState.status, shakaState.error]);

  // A series' theme gives way to the video at once.
  useEffect(() => stopThemeMusic(), []);

  // Start playing as soon as the manifest is loaded (the click on "Play" is
  // the user gesture); fall back to the big play button if the browser refuses.
  useEffect(() => {
    if (shakaState.status !== 'ready') return;
    videoRef.current?.play().then(
      () => setAutoplayBlocked(false),
      () => setAutoplayBlocked(true),
    );
  }, [shakaState.status]);

  const togglePlay = useCallback(() => {
    flash(media.paused ? 'play' : 'pause');
    media.togglePlay();
  }, [media, flash]);

  const skip = useCallback(
    (delta) => {
      media.seekBy(delta);
      flash(delta < 0 ? 'replay' : 'forward', `${delta > 0 ? '+' : '−'}${Math.abs(delta)} s`, delta < 0 ? 'left' : 'right');
    },
    [media, flash],
  );

  const changeVolume = useCallback(
    (delta) => {
      const next = Math.max(0, Math.min(1, (media.muted ? 0 : media.volume) + delta));
      media.setVolume(next);
      flash(next === 0 ? 'volumeOff' : next < 0.5 ? 'volumeLow' : 'volumeHigh', `${Math.round(next * 100)} %`);
    },
    [media, flash],
  );

  const togglePip = useCallback(() => {
    const video = videoRef.current;
    if (!video || !document.pictureInPictureEnabled) return;
    if (document.pictureInPictureElement) document.exitPictureInPicture().catch(() => {});
    else video.requestPictureInPicture().catch(() => {});
  }, []);

  // Cycles through the subtitle options: off, then each track in turn.
  const cycleSubtitles = useCallback(() => {
    const list = options.text;
    if (list.length < 2) return;
    const index = list.findIndex((o) => o.selected);
    const next = list[(index + 1) % list.length];
    next.onSelect();
    flash('subtitles', next.label);
  }, [options.text, flash]);

  // Keyboard shortcuts, YouTube / Plex style.
  useEffect(() => {
    const onKey = (e) => {
      if (isTyping(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
      const actions = {
        ' ': togglePlay,
        k: togglePlay,
        ArrowLeft: () => skip(-SKIP_BACK),
        j: () => skip(-SKIP_BACK),
        ArrowRight: () => skip(SKIP_FORWARD),
        l: () => skip(SKIP_FORWARD),
        ArrowUp: () => changeVolume(0.1),
        ArrowDown: () => changeVolume(-0.1),
        m: () => {
          media.toggleMute();
          flash(media.muted ? 'volumeHigh' : 'volumeOff');
        },
        f: toggleFullscreen,
        c: cycleSubtitles,
        p: togglePip,
        i: () => setSettingsTab((tab) => (tab === 'info' ? null : 'info')),
      };
      const action = actions[e.key] ?? actions[e.key.toLowerCase()];
      if (!action) return;
      e.preventDefault();
      action();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePlay, skip, changeVolume, media, flash, toggleFullscreen, cycleSubtitles, togglePip]);

  const toggleSettings = (tab) => setSettingsTab((current) => (current === tab ? null : tab));
  const closeSettings = useCallback(() => setSettingsTab(null), []);

  const loading = preparing || shakaState.status === 'loading' || (media.waiting && !media.paused);
  const showBigPlay = shakaState.status === 'ready' && (!media.started || autoplayBlocked || media.ended) && !loading;
  const failed = streamError || (shakaState.status === 'error' ? shakaState.error : null);
  const poster = artworkUrl(posterItem, 'background', 'background');
  const duration = media.duration || (durationHintMs ? durationHintMs / 1000 : 0);
  const remaining = Math.max(0, duration - media.currentTime);
  const subtitlesOn = options.text.some((o) => o.selected && o.key !== 'off');

  return (
    <div
      ref={rootRef}
      className={styles.player}
      data-idle={idle || undefined}
      data-started={media.started || undefined}
    >
      <video ref={videoRef} className={styles.video} playsInline crossOrigin="anonymous" />
      <div ref={captionsRef} className={styles.captions} aria-live="polite" />

      {!media.started && poster && <div className={styles.poster} style={{ backgroundImage: `url("${poster}")` }} />}

      {/* click to play / pause, double-click for fullscreen */}
      <div
        className={styles.surface}
        onClick={() => (settingsTab ? closeSettings() : togglePlay())}
        onDoubleClick={toggleFullscreen}
      />

      <header className={styles.top}>
        <PlayerIconButton icon="arrowLeft" label={t('Back')} onClick={onBack} tooltip="bottom" />
        <div className={styles.titles}>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          <h1 className={styles.title}>{title}</h1>
        </div>
      </header>

      <div className={styles.center}>
        {loading && <span className={styles.spinner} role="status" aria-label={t('Loading…')} />}
        {showBigPlay && (
          <button type="button" className={styles.bigPlay} onClick={togglePlay} aria-label={media.ended ? t('Replay') : t('Play')}>
            <Icon name={media.ended ? 'replay' : 'play'} size={40} />
          </button>
        )}
        <PlayerFeedback feedback={feedback} />
      </div>

      {failed && (
        <div className={styles.error} role="alert">
          <Icon name="info" size={36} />
          <h2>
            {failed.title ??
              (failed.code === 'unsupported' ? t('This browser cannot play this video.') : t('Playback failed'))}
          </h2>
          {failed.detail ? (
            <p>{failed.detail}</p>
          ) : (
            failed.code &&
            failed.code !== 'unsupported' && <p>{t('Shaka error {{code}}', { code: failed.code })}</p>
          )}
          <button type="button" onClick={onBack}>
            {t('Back')}
          </button>
        </div>
      )}

      <div className={styles.bottom}>
        <div className={styles.timeline}>
          <span className={styles.time}>{formatClock(media.currentTime)}</span>
          <SeekBar
            currentTime={media.currentTime}
            duration={duration}
            buffered={media.buffered}
            onSeek={media.seek}
            onScrubChange={setScrubbing}
          />
          <button
            type="button"
            className={styles.time}
            onClick={() => setShowRemaining((v) => !v)}
            title={t('Toggle remaining / total time')}
          >
            {showRemaining ? `−${formatClock(remaining)}` : formatClock(duration)}
          </button>
        </div>

        <div className={styles.controls}>
          <div className={styles.group}>
            <PlayerIconButton
              icon={media.paused ? 'play' : 'pause'}
              label={media.paused ? t('Play (k)') : t('Pause (k)')}
              onClick={togglePlay}
              size="lg"
            />
            <PlayerIconButton icon="replay" badge={SKIP_BACK} label={t('Back {{seconds}} s (←)', { seconds: SKIP_BACK })} onClick={() => skip(-SKIP_BACK)} />
            <PlayerIconButton icon="forward" badge={SKIP_FORWARD} label={t('Forward {{seconds}} s (→)', { seconds: SKIP_FORWARD })} onClick={() => skip(SKIP_FORWARD)} />
            <VolumeControl volume={media.volume} muted={media.muted} onVolume={media.setVolume} onToggleMute={media.toggleMute} />
          </div>

          <div className={`${styles.group} ${styles.settingsAnchor}`}>
            {settingsTab && (
              <PlayerSettings
                tab={settingsTab}
                onTab={setSettingsTab}
                onClose={closeSettings}
                audioOptions={options.audio}
                textOptions={options.text}
                qualityOptions={options.quality}
                rate={media.rate}
                decision={decision}
                source={source}
                live={live}
                onRate={media.setRate}
              />
            )}
            {media.rate !== 1 && <span className={styles.rate}>{media.rate}×</span>}
            <PlayerIconButton
              icon="subtitles"
              label={t('Audio & subtitles')}
              active={subtitlesOn || settingsTab === 'tracks'}
              onClick={() => toggleSettings('tracks')}
              data-settings-toggle
              aria-expanded={settingsTab === 'tracks'}
            />
            <PlayerIconButton
              icon="settings"
              label={t('Settings')}
              active={settingsTab === 'quality' || settingsTab === 'speed' || settingsTab === 'info'}
              onClick={() => toggleSettings('quality')}
              data-settings-toggle
              aria-expanded={!!settingsTab && settingsTab !== 'tracks'}
            />
            {typeof document !== 'undefined' && document.pictureInPictureEnabled && (
              <PlayerIconButton icon="pip" label={t('Picture in picture (p)')} onClick={togglePip} />
            )}
            <PlayerIconButton
              icon={fullscreen ? 'fullscreenExit' : 'fullscreen'}
              label={fullscreen ? t('Exit full screen (f)') : t('Full screen (f)')}
              onClick={toggleFullscreen}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
