import { describe, expect, it } from 'vitest';
import { decisionFromStream, playbackMode } from './playback';

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
});
