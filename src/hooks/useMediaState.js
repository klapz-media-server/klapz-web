import { useCallback, useEffect, useState } from 'react';

const VOLUME_KEY = 'open-web.player.volume';

function readStoredVolume() {
  try {
    const stored = JSON.parse(localStorage.getItem(VOLUME_KEY));
    if (stored && typeof stored.volume === 'number') return stored;
  } catch {
    /* storage unavailable */
  }
  return { volume: 1, muted: false };
}

function bufferedEnd(video) {
  const { buffered, currentTime } = video;
  for (let i = 0; i < buffered.length; i++) {
    if (buffered.start(i) <= currentTime + 0.5 && buffered.end(i) >= currentTime) return buffered.end(i);
  }
  return currentTime;
}

/**
 * Mirrors an HTMLVideoElement's playback state into React and exposes the
 * usual commands. Volume is remembered across sessions.
 */
export function useMediaState(videoRef) {
  const [state, setState] = useState(() => ({
    paused: true,
    started: false,
    ended: false,
    waiting: false,
    currentTime: 0,
    duration: 0,
    buffered: 0,
    rate: 1,
    ...readStoredVolume(),
  }));

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;
    const { volume, muted } = readStoredVolume();
    video.volume = volume;
    video.muted = muted;

    const sync = (patch) => setState((s) => ({ ...s, ...patch }));
    const handlers = {
      play: () => sync({ paused: false, started: true, ended: false }),
      pause: () => sync({ paused: true }),
      ended: () => sync({ paused: true, ended: true }),
      waiting: () => sync({ waiting: true }),
      playing: () => sync({ waiting: false, paused: false }),
      canplay: () => sync({ waiting: false }),
      seeked: () => sync({ currentTime: video.currentTime }),
      timeupdate: () => sync({ currentTime: video.currentTime, buffered: bufferedEnd(video) }),
      progress: () => sync({ buffered: bufferedEnd(video) }),
      durationchange: () => sync({ duration: Number.isFinite(video.duration) ? video.duration : 0 }),
      loadedmetadata: () => sync({ duration: Number.isFinite(video.duration) ? video.duration : 0 }),
      // Shaka drops the rate to 0 while buffering: only mirror real rates.
      ratechange: () => video.playbackRate > 0 && sync({ rate: video.playbackRate }),
      volumechange: () => {
        sync({ volume: video.volume, muted: video.muted });
        try {
          localStorage.setItem(VOLUME_KEY, JSON.stringify({ volume: video.volume, muted: video.muted }));
        } catch {
          /* storage unavailable */
        }
      },
    };
    Object.entries(handlers).forEach(([name, fn]) => video.addEventListener(name, fn));
    return () => Object.entries(handlers).forEach(([name, fn]) => video.removeEventListener(name, fn));
  }, [videoRef]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused || v.ended) v.play().catch(() => {});
    else v.pause();
  }, [videoRef]);

  const seek = useCallback(
    (time) => {
      const v = videoRef.current;
      if (!v || !Number.isFinite(v.duration)) return;
      v.currentTime = Math.max(0, Math.min(v.duration - 0.1, time));
      setState((s) => ({ ...s, currentTime: v.currentTime }));
    },
    [videoRef],
  );

  const seekBy = useCallback((delta) => {
    const v = videoRef.current;
    if (v) seek(v.currentTime + delta);
  }, [videoRef, seek]);

  const setVolume = useCallback(
    (value) => {
      const v = videoRef.current;
      if (!v) return;
      v.volume = Math.max(0, Math.min(1, value));
      v.muted = v.volume === 0;
    },
    [videoRef],
  );

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.muted && v.volume === 0) v.volume = 0.5;
    v.muted = !v.muted;
  }, [videoRef]);

  const setRate = useCallback(
    (rate) => {
      const v = videoRef.current;
      if (v) v.playbackRate = rate;
    },
    [videoRef],
  );

  return { ...state, togglePlay, seek, seekBy, setVolume, toggleMute, setRate };
}
