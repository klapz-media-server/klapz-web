/**
 * The steps from the top of a path the server gave down to it, each with its own path: a
 * breadcrumb. The server writes Windows paths with `\` (`D:\Movies`, `\\nas\share\Movies`)
 * and the others with `/`, always in canonical form, so the first step is the drive, the
 * share or `/`.
 */
export function pathSegments(path) {
  if (!path) return [];
  const share = /^(\\\\[^\\]+\\[^\\]+)\\?(.*)$/.exec(path);
  const drive = /^([A-Za-z]:)\\?(.*)$/.exec(path);
  let top;
  let rest;
  let separator;
  if (share) {
    [, top, rest] = share;
    separator = '\\';
  } else if (drive) {
    top = drive[1];
    rest = drive[2];
    separator = '\\';
  } else {
    top = '/';
    rest = path.replace(/^\/+/, '');
    separator = '/';
  }
  // A drive's own path is `D:\`: `D:` alone names the current directory of that drive.
  const segments = [{ name: top, path: drive ? `${top}\\` : top }];
  let current = top === '/' ? '' : top;
  for (const name of rest.split(separator).filter(Boolean)) {
    current = `${current}${separator}${name}`;
    segments.push({ name, path: current });
  }
  return segments;
}
