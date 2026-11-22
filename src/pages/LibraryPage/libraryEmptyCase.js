/**
 * Why a library shows nothing, from what is known of it:
 *
 * - `noMatch`: filters are on, and nothing matches them;
 * - `scanning`: a scan runs, and items will appear as it finds them;
 * - `noFolder`: the library has no folder to scan;
 * - `neverScanned`: no scan has run yet;
 * - `nothingFound`: the scans ran, and found nothing.
 *
 * `roots` is null while unknown.
 */
export function libraryEmptyCase({ filtered = false, scanning = false, scannedAt = null, roots = null }) {
  if (filtered) return 'noMatch';
  if (scanning) return 'scanning';
  if (roots && roots.length === 0) return 'noFolder';
  if (!scannedAt) return 'neverScanned';
  return 'nothingFound';
}
