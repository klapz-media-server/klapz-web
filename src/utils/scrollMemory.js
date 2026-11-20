/**
 * Where a page was scrolled to, per history entry, for the pages that render their content
 * late (a virtual grid knows its height only once its count arrives) and so restore it
 * themselves when the user comes back to them.
 */
const PREFIX = 'open-web.scroll.';

// The first entry of a tab is always `default`: the address tells two such apart.
const entry = (location) => `${PREFIX}${location.key}:${location.pathname}${location.search}`;

export function saveScroll(location, y) {
  try {
    sessionStorage.setItem(entry(location), String(Math.round(y)));
  } catch {
    // Storage refused: coming back starts at the top.
  }
}

export function savedScroll(location) {
  try {
    const value = sessionStorage.getItem(entry(location));
    return value === null ? null : Number(value);
  } catch {
    return null;
  }
}
