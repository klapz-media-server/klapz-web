import { useCallback, useEffect, useRef, useState } from 'react';
// The experimental build is the one that ships the SSA/ASS text parser: the server keeps an ASS
// subtitle as it is.
import shaka from 'shaka-player/dist/shaka-player.experimental.js';
import { checkSession } from '../apollo/client';
import { createNetworkAbr } from '../utils/networkAbr';

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

/**
 * The tracks to list. `videoDeliveryOf(variant)` gives the server's delivery of a variant's
 * video ('remux' or 'transcode'); a video track carries its rung's as `delivery`.
 */
function readTracks(player, videoDeliveryOf) {
  const variants = player.getVariantTracks();
  const deliveryOf = (track) => {
    const variant = variants.find(
      (v) =>
        (v.videoBandwidth === track.bandwidth || v.bandwidth === track.bandwidth) &&
        v.width === track.width &&
        v.height === track.height,
    );
    return (variant && videoDeliveryOf(variant)) ?? null;
  };
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
    if (!video.some((v) => v.quality === quality)) video.push({ ...track, quality, delivery: deliveryOf(track) });
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
 * for a file played as is, `textTrack` `{ url, mimeType, language, label }` —
 * the subtitle chosen, shown as soon as it is loaded: a file served beside the
 * stream when it has a `url`, else the text track the manifest lists. A change
 * of `textTrack` alone switches the subtitle without loading `src` again.
 */
export function useShakaPlayer(videoRef, src, captionsRef, options = {}) {
  const optionsRef = useRef(options);
  optionsRef.current = options;
  // A new source reuses the same <video>: the previous player must be fully
  // destroyed (it detaches from the element) before the next one attaches.
  const destroyedRef = useRef(Promise.resolve());
  const playerRef = useRef(null);
  // True while playback is held on the remux with ABR off (see `startOnRemux`).
  const pinnedOnRemuxRef = useRef(false);
  // The server's wait before each video segment, kept apart from the link's speed.
  const productionRef = useRef(null);
  const [status, setStatus] = useState('idle'); // idle | loading | ready | error
  const [error, setError] = useState(null);
  const [tracks, setTracks] = useState(EMPTY_TRACKS);
  const [abr, setAbr] = useState(true);
  const [activeQuality, setActiveQuality] = useState(null);
  // `{ video, audio }`, each 'remux' or 'transcode', from the manifest; null without the tags.
  const [activeDelivery, setActiveDelivery] = useState(null);
  // The subtitle files added to the current player, by URL, so a switch back reuses them.
  const addedTextRef = useRef(new Map());
  // Each switch counts: one overtaken while its file loads does not select it.
  const textSwitchRef = useRef(0);

  const showTextTrack = useCallback(async (player, textTrack) => {
    const turn = ++textSwitchRef.current;
    if (!textTrack) {
      // Subtitles start off, like Plex; the user picks a track.
      player.selectTextTrack(null);
      return;
    }
    if (!textTrack.url) {
      const added = new Set([...addedTextRef.current.values()].map((track) => track.id));
      const listed = player.getTextTracks().find((track) => !added.has(track.id));
      player.selectTextTrack(listed ?? null);
      return;
    }
    let track = addedTextRef.current.get(textTrack.url);
    if (!track) {
      try {
        track = await player.addTextTrackAsync(
          textTrack.url,
          textTrack.language || 'und',
          'subtitles',
          textTrack.mimeType,
          undefined,
          textTrack.label,
        );
      } catch {
        return; /* the video still plays without its subtitles */
      }
      addedTextRef.current.set(textTrack.url, track);
    }
    if (turn === textSwitchRef.current && playerRef.current === player) player.selectTextTrack(track);
  }, []);

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

    // The server tags each representation `klapz:delivery="remux"` (the file's own track) or
    // `"transcode"`, by its id. Playback starts on the video remux when the browser can decode
    // it, rather than on the encode Shaka's default bandwidth estimate would pick; ABR still
    // moves down if the link cannot keep up.
    const deliveries = new Map();
    let remuxBandwidth = 0;
    const collectDeliveries = (node) => {
      const delivery = node.attributes?.['klapz:delivery'];
      if (node.tagName === 'Representation' && delivery) {
        deliveries.set(node.attributes.id, delivery);
        const isVideo = (node.attributes.mimeType ?? node.parent?.attributes?.mimeType ?? '').startsWith('video/');
        if (isVideo && delivery === 'remux') {
          remuxBandwidth = Math.max(remuxBandwidth, Number(node.attributes.bandwidth) || 0);
        }
      }
      for (const child of node.children ?? []) if (typeof child === 'object' && child) collectDeliveries(child);
    };

    // Over HLS the master playlist tags each variant `X-KLAPZ-DELIVERY=REMUX|TRANSCODE`; Shaka
    // gives a variant the playlist's BANDWIDTH, which keys it here. The tag names the video:
    // the audio's delivery stays the server's decision.
    const hlsDeliveries = new Map();
    const collectHlsDeliveries = (text) => {
      for (const line of text.split(/\r?\n/)) {
        if (!line.startsWith('#EXT-X-STREAM-INF:')) continue;
        const bandwidth = Number(/[:,]BANDWIDTH=(\d+)/.exec(line)?.[1]);
        const delivery = /[:,]X-KLAPZ-DELIVERY=(\w+)/.exec(line)?.[1]?.toLowerCase();
        if (!bandwidth || !delivery) continue;
        hlsDeliveries.set(bandwidth, delivery);
        if (delivery === 'remux') remuxBandwidth = Math.max(remuxBandwidth, bandwidth);
      }
    };
    player.getNetworkingEngine()?.registerResponseFilter((type, response) => {
      if (type !== shaka.net.NetworkingEngine.RequestType.MANIFEST) return;
      let text;
      try {
        text = shaka.util.StringUtils.fromUTF8(response.data);
      } catch {
        return;
      }
      if (!text.startsWith('#EXTM3U') || !text.includes('#EXT-X-STREAM-INF')) return;
      collectHlsDeliveries(text);
      if (remuxBandwidth) player.configure('abr.defaultBandwidthEstimate', remuxBandwidth * 1.2);
    });

    const videoDeliveryOf = (variant) =>
      deliveries.get(variant.originalVideoId) ?? hlsDeliveries.get(variant.bandwidth) ?? null;
    const audioDeliveryOf = (variant) => deliveries.get(variant.originalAudioId) ?? null;
    const hasDeliveries = () => deliveries.size > 0 || hlsDeliveries.size > 0;

    // ABR judges the link alone: the time the server spends producing a segment is not counted.
    const networkAbr = createNetworkAbr();
    productionRef.current = networkAbr.production;
    player.configure({
      abrFactory: networkAbr.factory,
      // A segment request is tried up to 5 times (Shaka's default is 2) before playback fails.
      // `dontChooseCodecs`: Shaka otherwise keeps a single codec per resolution, the lighter one,
      // which can drop the remux (HEVC, AV1…) in favour of an H.264 encode of the same size.
      streaming: {
        bufferingGoal: 30,
        rebufferingGoal: 2,
        retryParameters: { maxAttempts: 5 },
        dontChooseCodecs: true,
      },
      // `useNetworkInformation`: when the browser exposes `navigator.connection.downlink`
      // (Chrome, Edge: capped at 10 Mb/s), Shaka uses it in place of `defaultBandwidthEstimate`,
      // and the remux would never be the starting pick.
      abr: { enabled: true, useNetworkInformation: false },
      manifest: {
        dash: {
          manifestPreprocessorTXml: (mpd) => {
            collectDeliveries(mpd);
            if (remuxBandwidth) player.configure('abr.defaultBandwidthEstimate', remuxBandwidth * 1.2);
          },
        },
      },
    });

    // While ABR stays on, its next evaluation overrides a manual pick with its own bandwidth
    // measure — which a segment the server is still producing makes look slow. So playback is
    // pinned on the remux, ABR off, and ABR only takes over once playback actually stalls.
    pinnedOnRemuxRef.current = false;
    let hasPlayed = false;
    let stalls = [];
    const STALLS_BEFORE_FALLBACK = 2;
    const STALL_WINDOW_MS = 60_000;

    const isRemuxVideo = (variant) => videoDeliveryOf(variant) === 'remux';
    const startOnRemux = () => {
      const variants = player.getVariantTracks();
      const active = variants.find((t) => t.active);
      // Same audio as now: only the picture changes rung.
      const candidates = variants.filter(
        (t) => isRemuxVideo(t) && (!active || t.originalAudioId === active.originalAudioId),
      );
      const best = candidates.sort((a, b) => b.bandwidth - a.bandwidth)[0];
      if (!best) return;
      player.configure('abr.enabled', false);
      pinnedOnRemuxRef.current = true;
      stalls = [];
      if (!active || active.id !== best.id) player.selectVariantTrack(best, true);
    };

    const onPlaying = () => {
      hasPlayed = true;
    };
    const onBuffering = (event) => {
      if (cancelled || !pinnedOnRemuxRef.current || !event.buffering || !hasPlayed || video.seeking) return;
      const now = Date.now();
      stalls = [...stalls.filter((at) => now - at < STALL_WINDOW_MS), now];
      if (stalls.length >= STALLS_BEFORE_FALLBACK) {
        // The link cannot keep up with the file's own track: let ABR pick an encode.
        pinnedOnRemuxRef.current = false;
        player.configure('abr.enabled', true);
      }
    };
    video.addEventListener('playing', onPlaying);
    player.addEventListener('buffering', onBuffering);

    const refresh = () => {
      if (cancelled) return;
      setTracks(readTracks(player, videoDeliveryOf));
      const active = player.getVideoTracks().find((t) => t.active);
      setActiveQuality(active ? qualityName(active.width, active.height) : null);
      const variant = player.getVariantTracks().find((t) => t.active);
      setActiveDelivery(
        variant && hasDeliveries() ? { video: videoDeliveryOf(variant), audio: audioDeliveryOf(variant) } : null,
      );
    };
    const onError = (event) => {
      if (cancelled) return;
      const detail = event.detail ?? event;
      // A stream refused `401`: its token died with the session, which may be the account's.
      if (detail.code === shaka.util.Error.Code.BAD_HTTP_STATUS && detail.data?.[1] === 401) checkSession();
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
    setActiveDelivery(null);
    addedTextRef.current = new Map();

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
        startOnRemux();
        await showTextTrack(player, textTrack);
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
      video.removeEventListener('playing', onPlaying);
      playerRef.current = null;
      destroyedRef.current = player.destroy();
    };
  }, [videoRef, src, captionsRef, showTextTrack]);

  // Another subtitle for the same stream: switched in the player, the stream left as it is.
  const textTrack = options.textTrack;
  const textKey = textTrack ? (textTrack.url ?? 'listed') : null;
  useEffect(() => {
    const player = playerRef.current;
    if (player && status === 'ready') showTextTrack(player, optionsRef.current.textTrack);
  }, [status, textKey, showTextTrack]);

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
    pinnedOnRemuxRef.current = false;
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
    return { stats: player.getStats(), variant, bufferAhead, production: productionRef.current };
  }, [videoRef]);

  return {
    status,
    getLiveInfo,
    error,
    tracks,
    abr,
    activeQuality,
    activeDelivery,
    selectAudio,
    selectText,
    selectQuality,
  };
}
