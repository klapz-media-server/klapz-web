/**
 * Why a library shows nothing, from what is known of it:
 *
 * - `noMatch`: filters are on, and nothing matches them;
 * - `scanning`: a scan runs, and items will appear as it finds them;
 * - `noFolder`: the library has no folder to scan;
 * - `unreachable`: a folder cannot be reached (an unmounted disk, a share that is down), which is
 *   not an empty library;
 * - `neverScanned`: no scan has run yet;
 * - `nothingFound`: the scans ran over reachable folders, and found nothing.
 *
 * `roots` is null while unknown; a root's `reachable` is undefined when the server does not say.
 */
export function libraryEmptyCase({ filtered = false, scanning = false, scannedAt = null, roots = null }) {
  if (filtered) return 'noMatch';
  if (scanning) return 'scanning';
  if (roots && roots.length === 0) return 'noFolder';
  if (roots?.some((root) => root.reachable === false)) return 'unreachable';
  if (!scannedAt) return 'neverScanned';
  return 'nothingFound';
}
