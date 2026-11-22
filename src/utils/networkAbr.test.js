import { describe, expect, it, vi } from 'vitest';

const samples = [];
vi.mock('shaka-player/dist/shaka-player.experimental.js', () => ({
  default: {
    abr: {
      SimpleAbrManager: class {
        segmentDownloaded(deltaTimeMs, numBytes) {
          samples.push([deltaTimeMs, numBytes]);
        }
      },
    },
  },
}));

const { createNetworkAbr } = await import('./networkAbr');

describe('createNetworkAbr', () => {
  it('takes the server wait out of the first sample and keeps it apart', () => {
    samples.length = 0;
    const { factory, production } = createNetworkAbr();
    const manager = factory();
    const request = { contentType: 'video', timeToFirstByte: 2000, packetNumber: 1 };
    manager.segmentDownloaded(2150, 500_000, true, request);
    request.packetNumber = 2;
    manager.segmentDownloaded(120, 1_500_000, true, request);
    expect(samples).toEqual([
      [150, 500_000],
      [120, 1_500_000],
    ]);
    expect(production.lastMs).toBe(2000);
    expect(production.averageMs).toBe(2000);
  });

  it('keeps a sample counted when the body came at once, and leaves a cache hit alone', () => {
    samples.length = 0;
    const { factory, production } = createNetworkAbr();
    const manager = factory();
    manager.segmentDownloaded(1505, 3_000_000, true, { contentType: 'video', timeToFirstByte: 1500, packetNumber: 1 });
    manager.segmentDownloaded(5, 3_000_000, true, { contentType: 'video', timeToFirstByte: 4, packetNumber: 1 });
    manager.segmentDownloaded(900, 40_000, true, { contentType: 'audio', timeToFirstByte: 800, packetNumber: 1 });
    expect(samples).toEqual([
      [21, 3_000_000],
      [5, 3_000_000],
      [100, 40_000],
    ]);
    expect(production.lastMs).toBe(1500);
  });
});
