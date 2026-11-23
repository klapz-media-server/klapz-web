/**
 * Where a library's files stand once a scan has listed them: the server reads every file's
 * headers first (tracks, codecs, durations), then measures every file's packets.
 *
 * `analysis` is `Library.analysis`. Returns null when nothing is left to read, otherwise the
 * round under way — `headers` or `packets` — with how many files it has done out of how many.
 */
export function analysisStage(analysis) {
  if (!analysis) return null;
  const { fileCount, readFileCount, completeFileCount } = analysis;
  if (readFileCount < fileCount) return { round: 'headers', done: readFileCount, total: fileCount };
  if (completeFileCount < fileCount) return { round: 'packets', done: completeFileCount, total: fileCount };
  return null;
}
