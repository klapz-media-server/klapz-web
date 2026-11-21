/**
 * Stream decision, in Plex's terms:
 *
 * - DIRECT_PLAY   the file is sent as is (no remux, no conversion);
 * - DIRECT_STREAM the video is copied; the container is remuxed and/or the
 *                 audio converted;
 * - TRANSCODE     the video is converted.
 *
 * A decision is `{ video, audio, container, speed }`, where `video` and
 * `audio` are the GraphQL `StreamDecisionType` (COPY | TRANSCODE),
 * `container` is COPY | REMUX, and `speed` the transcoder speed as a
 * multiple of real time (null when unknown).
 */
export function playbackMode(decision) {
  if (!decision) return null;
  if (decision.delivery) return decision.delivery;
  if (decision.video === 'TRANSCODE') return 'TRANSCODE';
  if (decision.audio === 'TRANSCODE' || decision.container === 'REMUX') return 'DIRECT_STREAM';
  return 'DIRECT_PLAY';
}

/** From startStream's `StreamObject`. Only direct play keeps the container. */
export function decisionFromStream(stream) {
  if (!stream) return null;
  return {
    delivery: stream.delivery,
    video: stream.videoDecision,
    audio: stream.audioDecision,
    container: stream.delivery === 'DIRECT_PLAY' ? 'COPY' : 'REMUX',
    // 'DASH' or 'HLS'; null for direct play.
    protocol: stream.protocol ?? null,
    // Not in the schema yet: shown as soon as the server reports it.
    speed: stream.transcodeSpeed ?? null,
    width: stream.width,
    height: stream.height,
    videoBitrate: stream.videoBitrate,
  };
}

/**
 * The decision for what plays now. In an adaptive stream the player moves between the
 * remux and the encodes, so the server's decision at start no longer says which one plays:
 * the manifest's `klapz:delivery` of the active tracks does (`{ video, audio }`, each
 * 'remux' or 'transcode').
 */
export function withManifestDelivery(decision, delivery) {
  if (!decision || !delivery || decision.delivery === 'DIRECT_PLAY') return decision;
  const read = (value, fallback) => (value === 'transcode' ? 'TRANSCODE' : value === 'remux' ? 'COPY' : fallback);
  const { delivery: _startedAs, ...rest } = decision;
  return { ...rest, video: read(delivery.video, decision.video), audio: read(delivery.audio, decision.audio) };
}

const TEST_DECISIONS = {
  play: { video: 'COPY', audio: 'COPY', container: 'COPY', speed: null },
  stream: { video: 'COPY', audio: 'TRANSCODE', container: 'REMUX', speed: 6.4 },
  transcode: { video: 'TRANSCODE', audio: 'TRANSCODE', container: 'REMUX', speed: 1.8 },
  slow: { video: 'TRANSCODE', audio: 'COPY', container: 'REMUX', speed: 0.7 },
};

/**
 * Test decision while the player plays a test manifest:
 * `?decision=play|stream|transcode|slow`, `&speed=2.3` overrides the speed.
 * Defaults to Direct Stream.
 */
export function testDecision(searchParams) {
  const base = TEST_DECISIONS[searchParams.get('decision')] ?? TEST_DECISIONS.stream;
  const speed = Number(searchParams.get('speed'));
  return { ...base, speed: Number.isFinite(speed) && speed > 0 ? speed : base.speed };
}
