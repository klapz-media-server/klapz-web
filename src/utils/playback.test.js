import { describe, expect, it } from 'vitest';
import { decisionFromStream, playbackMode, withManifestDelivery } from './playback';

describe('playbackMode', () => {
  it('reads the decision in Plex terms', () => {
    expect(playbackMode({ video: 'COPY', audio: 'COPY', container: 'COPY' })).toBe('DIRECT_PLAY');
    expect(playbackMode({ video: 'COPY', audio: 'TRANSCODE' })).toBe('DIRECT_STREAM');
    expect(playbackMode({ video: 'COPY', audio: 'COPY', container: 'REMUX' })).toBe('DIRECT_STREAM');
    expect(playbackMode({ video: 'TRANSCODE', audio: 'COPY' })).toBe('TRANSCODE');
    expect(playbackMode(null)).toBeNull();
  });

  it('trusts the delivery the server gives', () => {
    expect(playbackMode({ delivery: 'DIRECT_PLAY', video: 'TRANSCODE' })).toBe('DIRECT_PLAY');
  });
});

describe('decisionFromStream', () => {
  it('keeps the container only for direct play', () => {
    expect(decisionFromStream({ delivery: 'DIRECT_PLAY', videoDecision: 'COPY', audioDecision: 'COPY' }).container).toBe('COPY');
    expect(decisionFromStream({ delivery: 'TRANSCODE', videoDecision: 'COPY', audioDecision: 'TRANSCODE' }).container).toBe('REMUX');
    expect(decisionFromStream(null)).toBeNull();
  });

  it('carries the protocol of a conversion', () => {
    expect(decisionFromStream({ delivery: 'TRANSCODE', protocol: 'HLS' }).protocol).toBe('HLS');
    expect(decisionFromStream({ delivery: 'DIRECT_PLAY', protocol: null }).protocol).toBeNull();
  });
});

describe('withManifestDelivery', () => {
  const started = { delivery: 'TRANSCODE', video: 'TRANSCODE', audio: 'COPY', container: 'REMUX' };

  it('follows the rung playing now', () => {
    const remux = withManifestDelivery(started, { video: 'remux', audio: 'remux' });
    expect(remux).toMatchObject({ video: 'COPY', audio: 'COPY', container: 'REMUX' });
    expect(playbackMode(remux)).toBe('DIRECT_STREAM');
    expect(playbackMode(withManifestDelivery(started, { video: 'transcode', audio: 'remux' }))).toBe('TRANSCODE');
  });

  it('keeps the start decision without tags, and for direct play', () => {
    expect(withManifestDelivery(started, null)).toBe(started);
    const direct = { delivery: 'DIRECT_PLAY', video: 'COPY', audio: 'COPY' };
    expect(withManifestDelivery(direct, { video: 'transcode', audio: 'transcode' })).toBe(direct);
  });
});
