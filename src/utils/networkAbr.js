import shaka from 'shaka-player/dist/shaka-player.experimental.js';

// Shaka drops a sample shorter than `abr.cacheLoadThreshold` (20 ms by default) as a cache hit.
const CACHE_LOAD_THRESHOLD_MS = 20;
const AVERAGE_WEIGHT = 0.3;

/**
 * An ABR manager that measures the link alone. The server answers a segment once it has
 * produced it: until then the request waits, then the body comes at the link's speed. Shaka
 * times a segment's first progress sample from the request, so that wait would read as a slow
 * link and push ABR down a rung that the network could carry.
 *
 * The wait (time to first byte, the round trip included) is taken out of the first sample of
 * each request and kept apart in `production`: `{ lastMs, averageMs }` for video segments.
 */
export function createNetworkAbr() {
  const production = { lastMs: null, averageMs: null };

  const record = (waitMs) => {
    production.lastMs = waitMs;
    production.averageMs =
      production.averageMs == null ? waitMs : production.averageMs + AVERAGE_WEIGHT * (waitMs - production.averageMs);
  };

  const factory = () => {
    const manager = new shaka.abr.SimpleAbrManager();
    const segmentDownloaded = manager.segmentDownloaded.bind(manager);
    manager.segmentDownloaded = (deltaTimeMs, numBytes, allowSwitch, request, context) => {
      let networkMs = deltaTimeMs;
      // `packetNumber` counts progress samples within one attempt: only the first one spans the
      // wait. A sample already under the threshold is a cache hit and stays as it is.
      if (request?.packetNumber === 1 && request.timeToFirstByte > 0 && deltaTimeMs > CACHE_LOAD_THRESHOLD_MS) {
        const waitMs = Math.min(request.timeToFirstByte, deltaTimeMs);
        // Kept above the threshold so the bytes still count: Shaka weighs a sample by its
        // duration, so a short one barely moves the estimate.
        networkMs = Math.max(deltaTimeMs - waitMs, CACHE_LOAD_THRESHOLD_MS + 1);
        if (request.contentType === 'video') record(waitMs);
      }
      segmentDownloaded(networkMs, numBytes, allowSwitch, request, context);
    };
    return manager;
  };

  return { factory, production };
}
