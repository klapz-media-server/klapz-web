/**
 * Every URL of the app is built here.
 *
 * An item's URL carries its id for the app, then its slug for people:
 * `/movie/SXRlbTo1NzY5NDc=/les-croods`. The slug is a name, not an identity
 * (two films can share one), so pages load by id and only rewrite a slug
 * that is missing or out of date.
 *
 * Ids are base64 and go into URLs as they are, `=` included; only the
 * characters that would break a path or a query are escaped.
 */

const FALLBACK_SLUG = '-';

/** An id or a slug as a path segment: `=` stays, `/ ? # %` and spaces are escaped. */
export function segment(value) {
  return String(value).replace(/[/?#%\s&]/g, (c) => encodeURIComponent(c));
}

/** The value of a route param, whether or not the router already decoded it. */
export function readParam(value) {
  if (value == null) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** A query string that keeps `=` inside values readable: `?tag=VGFnOjk2MA==&kind=GENRE`. */
export function queryString(params) {
  const parts = Object.entries(params ?? {})
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v)).replace(/%3D/gi, '=')}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

const slugOf = (item) => segment(item?.slug || FALLBACK_SLUG);

export function moviePath(movie) {
  return `/movie/${segment(movie.id)}/${slugOf(movie)}`;
}

export function showPath(show) {
  return `/show/${segment(show.id)}/${slugOf(show)}`;
}

/** A season is shown on its series' page: `/show/<id>/bull/<seasonId>/bull-s01`. */
export function seasonPath(show, season) {
  return `${showPath(show)}/${segment(season.id)}/${slugOf(season)}`;
}

export function itemPath(item) {
  if (!item) return '/';
  switch (item.__typename) {
    case 'Movie':
      return moviePath(item);
    case 'Show':
      return showPath(item);
    case 'Season':
      return item.show ? seasonPath(item.show, item) : '/';
    case 'Episode':
      if (item.show && item.season) return `${seasonPath(item.show, item.season)}#e-${item.id}`;
      return item.show ? showPath(item.show) : '/';
    default:
      return '/';
  }
}

/** The player: `/play/<id>/<slug>`, `startMs` resumes at a position. */
export function playPath(item, startMs) {
  const base = `/play/${segment(item.id)}/${slugOf(item)}`;
  return startMs > 0 ? `${base}${queryString({ t: Math.round(startMs) })}` : base;
}

export function libraryPath(libraryId, params) {
  return `/library/${segment(libraryId)}${queryString(params)}`;
}

/** Filter a library by a tag (genre, actor, director…). */
export function tagPath(libraryId, tag) {
  if (!libraryId || !tag) return '/';
  return libraryPath(libraryId, { view: 'all', tag: tag.id, kind: tag.kind });
}

export function searchPath(query, params) {
  return `/search${queryString({ q: query, ...params })}`;
}

/**
 * A `next` parameter as a path of this app, or `/`. It comes from the URL, so anyone can
 * write it: `//elsewhere`, `/\elsewhere`, `https://…` or `javascript:` must not send the
 * user away once signed in, and the sign-in pages must not send back to themselves.
 */
export function safeNext(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || /[\\\x00-\x1f]/.test(value)) return '/';
  try {
    const base = window.location.origin;
    const url = new URL(value, base);
    if (url.origin !== base || /^\/sign-(in|up)(\/|$)/.test(url.pathname)) return '/';
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '/';
  }
}

/** The sign-in page, coming back to `next` (an in-app path) once signed in. */
export function signInPath(next, page = '/sign-in') {
  const target = safeNext(next);
  return `${page}${queryString({ next: target === '/' ? null : target })}`;
}
