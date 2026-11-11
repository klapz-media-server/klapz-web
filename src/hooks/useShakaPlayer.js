import { useCallback, useEffect, useRef, useState } from 'react';
// The experimental build is the one that ships the SSA/ASS text parser,
// the format the server sends text subtitles in.
import shaka from 'shaka-player/dist/shaka-player.experimental.js';

let polyfilled = false;

const EMPTY_TRACKS = { audio: [], video: [], text: [] };

/** Standard name of a resolution, by width or height (2.39:1 films included). */
export function qualityName(width = 0, height = 0) {
  if (width >= 3800 || height >= 2100) return '4K';
  if (width >= 2500 || height >= 1400) return '1440p';
  if (width >= 1900 || height >= 1000) return '1080p';
  if (width >= 1260 || height >= 700) return '720p';
  if (width >= 840 || height >= 470) return '480p';
  if (width >= 620 || height >= 340) return '360p';
  return `${height}p`;
}

function readTracks(player) {
  // The same language often comes in several codecs: list it once,
  // keeping the active variant when there is one.
  const audio = [];
  for (const track of player.getAudioTracks()) {
    const key = [track.language, track.label, track.channelsCount, (track.roles ?? []).join()].join('|');
    const index = audio.findIndex((a) => a.key === key);
    if (index === -1) audio.push({ ...track, key });
    else if (track.active) audio[index] = { ...track, key };
  }
  // One entry per quality name, best bandwidth kept.
  const video = [];
  for (const track of [...player.getVideoTracks()].sort((a, b) => (b.bandwidth ?? 0) - (a.bandwidth ?? 0))) {
    const quality = qualityName(track.width, track.height);
    if (!video.some((v) => v.quality === quality)) video.push({ ...track, quality });
  }
  return { audio, video, text: player.getTextTracks() };
}

/**
 * Wraps a Shaka Player instance bound to `videoRef`, loads `src`, and
 * exposes its tracks and track selection. Subtitles are rendered as DOM
 * inside `captionsRef` (Shaka's UITextDisplayer), so the UI can style them
 * and lift them above the controls.
 *
 * `options` (read when `src` changes): `startTime` in seconds, `mimeType`
 * for a file played as is, `textTrack` `{ url, language, label }` — an ASS
 * file served beside the stream, shown as soon as it is loaded.
 */
export function useShakaPlayer(videoRef, src, captionsRef, options = {}) {
  const optionsRef = useRef(options);
  optionsRef.current = options;
  // A new source reuses the same <video>: the previous player must be fully
  // destroyed (it detaches from the element) before the next one attaches.
  const destroyedRef = useRef(Promise.resolve());
  const playerRef = useRef(null);
  const [status, setStatus] = useState('idle'); // idle | loading | ready | error
  const [error, setError] = useState(null);
  const [tracks, setTracks] = useState(EMPTY_TRACKS);
  const [abr, setAbr] = useState(true);
  const [activeQuality, setActiveQuality] = useState(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return undefined;

    if (!polyfilled) {
      shaka.polyfill.installAll();
      polyfilled = true;
    }
    if (!shaka.Player.isBrowserSupported()) {
      setStatus('error');
      setError({ code: 'unsupported' });
      return undefined;
    }

    const player = new shaka.Player();
    playerRef.current = player;
    if (captionsRef?.current) player.setVideoContainer(captionsRef.current);
    let cancelled = false;

    player.configure({
      streaming: { bufferingGoal: 30, rebufferingGoal: 2 },
      abr: { enabled: true },
    });

    const refresh = () => {
      if (cancelled) return;
      setTracks(readTracks(player));
      const active = player.getVideoTracks().find((t) => t.active);
      setActiveQuality(active ? qualityName(active.width, active.height) : null);
    };
    const onError = (event) => {
      if (cancelled) return;
      const detail = event.detail ?? event;
      setStatus('error');
      setError({ code: detail.code, message: detail.message });
    };

    player.addEventListener('error', onError);
    ['trackschanged', 'variantchanged', 'adaptation', 'textchanged', 'audiotrackchanged'].forEach((name) =>
      player.addEventListener(name, refresh),
    );

    setStatus('loading');
    setError(null);
    setTracks(EMPTY_TRACKS);
    setAbr(true);

    const { startTime, mimeType, textTrack } = optionsRef.current;
    destroyedRef.current
      .catch(() => {})
      .then(() => {
        if (cancelled) throw Object.assign(new Error('cancelled'), { code: shaka.util.Error.Code.LOAD_INTERRUPTED });
        return player.attach(video);
      })
      .then(() => player.load(src, startTime || null, mimeType || undefined))
      .then(async () => {
        if (cancelled) return;
        if (textTrack?.url) {
          try {
            const track = await player.addTextTrackAsync(
              textTrack.url,
              textTrack.language || 'und',
              'subtitles',
              'text/x-ssa',
              undefined,
              textTrack.label,
            );
            if (!cancelled) player.selectTextTrack(track);
          } catch {
            /* the video still plays without its subtitles */
          }
        } else {
          // Subtitles start off, like Plex; the user picks a track.
          player.selectTextTrack(null);
        }
        if (cancelled) return;
        refresh();
        setStatus('ready');
      })
      .catch((e) => {
        if (cancelled || e?.code === shaka.util.Error.Code.LOAD_INTERRUPTED) return;
        onError(e);
      });

    return () => {
      cancelled = true;
      playerRef.current = null;
      destroyedRef.current = player.destroy();
    };
  }, [videoRef, src, captionsRef]);

  const selectAudio = useCallback((track) => {
    playerRef.current?.selectAudioTrack(track);
  }, []);

  const selectText = useCallback((track) => {
    playerRef.current?.selectTextTrack(track ?? null);
  }, []);

  /** `null` restores adaptive bitrate. */
  const selectQuality = useCallback((track) => {
    const player = playerRef.current;
    if (!player) return;
    if (!track) {
      player.configure('abr.enabled', true);
      setAbr(true);
      return;
    }
    player.configure('abr.enabled', false);
    setAbr(false);
    player.selectVideoTrack(track, true);
  }, []);

  /** Live numbers for the Info tab: Shaka stats, active variant, buffer ahead. */
  const getLiveInfo = useCallback(() => {
    const player = playerRef.current;
    const video = videoRef.current;
    if (!player || !video) return null;
    const variant = player.getVariantTracks().find((t) => t.active) ?? null;
    let bufferAhead = 0;
    for (let i = 0; i < video.buffered.length; i++) {
      if (video.buffered.start(i) <= video.currentTime && video.buffered.end(i) >= video.currentTime) {
        bufferAhead = video.buffered.end(i) - video.currentTime;
      }
    }
    return { stats: player.getStats(), variant, bufferAhead };
  }, [videoRef]);

  return {
    status,
    getLiveInfo,
    error,
    tracks,
    abr,
    activeQuality,
    selectAudio,
    selectText,
    selectQuality,
  };
}
