/**
 * Display helpers. They read the current language from i18next, so the
 * components calling them must re-render on language change (any component
 * using `useTranslation()` does).
 */
import i18n, { locale } from '../i18n';

const t = (...args) => i18n.t(...args);

export function formatDuration(ms) {
  if (!ms) return null;
  const totalMin = Math.round(ms / 60000);
  const hours = Math.floor(totalMin / 60);
  const minutes = totalMin % 60;
  if (hours === 0) return i18n.t('{{minutes}} min', { minutes });
  if (minutes === 0) return i18n.t('{{hours}} h', { hours });
  return i18n.t('{{hours}} h {{minutes}}', { hours, minutes: String(minutes).padStart(2, '0') });
}

export function formatRemaining(durationMs, offsetMs) {
  if (!durationMs || !offsetMs) return null;
  const count = Math.max(0, Math.round((durationMs - offsetMs) / 60000));
  return count > 0 ? i18n.t('{{count}} min left', { count }) : null;
}

/** `fr/12` → `12`, `PG-13` stays. */
export function formatContentRating(rating) {
  if (!rating) return null;
  const parts = rating.split('/');
  return parts[parts.length - 1];
}

/** A `DateTime` of the API (RFC 3339, `2024-05-01T12:34:56Z`) as a `Date`, or null. */
export function parseDateTime(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** A point in time, as a day in the viewer's time zone: `1 May 2024`. */
export function formatDate(value) {
  const d = parseDateTime(value);
  return d ? new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'long', year: 'numeric' }).format(d) : null;
}

/**
 * A calendar day the API sends as midnight UTC (`releasedOn`): read in UTC, or a release
 * on the 1st would show as the 30th west of Greenwich.
 */
export function formatDay(value) {
  const d = parseDateTime(value);
  return d
    ? new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d)
    : null;
}

/** A day-only `DateTime` as `2024-05-01`, for a date input. */
export function dayOf(value) {
  const d = parseDateTime(value);
  return d ? d.toISOString().slice(0, 10) : '';
}

/** `2024-05-01` as the `DateTime` the API takes for a day, or null when it is no real day. */
export function dateTimeOfDay(day) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const d = parseDateTime(`${day}T00:00:00Z`);
  return d && d.toISOString().startsWith(day) ? `${day}T00:00:00Z` : null;
}

export function formatNumber(n) {
  return new Intl.NumberFormat(locale()).format(n);
}

export function formatBytes(bytes) {
  if (!bytes) return null;
  const units = [t('B'), t('KB'), t('MB'), t('GB'), t('TB')];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  const value = new Intl.NumberFormat(locale(), { maximumFractionDigits: v < 10 && i > 0 ? 1 : 0 }).format(v);
  return `${value} ${units[i]}`;
}

export function formatBitrate(kbps) {
  if (!kbps) return null;
  return kbps >= 1000
    ? i18n.t('{{value}} Mb/s', { value: new Intl.NumberFormat(locale(), { maximumFractionDigits: 1 }).format(kbps / 1000) })
    : i18n.t('{{value}} kb/s', { value: kbps });
}

export function resolutionLabel(width, height) {
  if (!width || !height) return null;
  if (width >= 3200 || height >= 1800) return '4K';
  if (width >= 1800 || height >= 1000) return '1080p';
  if (width >= 1200 || height >= 700) return '720p';
  if (height >= 560) return '576p';
  return 'SD';
}

export function channelsLabel(channels) {
  if (!channels) return null;
  if (channels === 1) return i18n.t('Mono');
  if (channels === 2) return i18n.t('Stereo');
  const layouts = { 6: '5.1', 7: '6.1', 8: '7.1' };
  return layouts[channels] ?? i18n.t('{{count}} channels', { count: channels });
}

/**
 * A language's name in the interface's language: from a server `Locale` (`{ tag, name }`) or
 * a BCP 47 string as the player reports it. `fr-CA` reads as "French (Canada)".
 */
export function languageLabel(language) {
  if (!language) return i18n.t('Unknown');
  const tag = typeof language === 'string' ? language : language.tag;
  let name = null;
  try {
    name = new Intl.DisplayNames([locale()], { type: 'language', fallback: 'none' }).of(tag);
  } catch {
    // Not a tag Intl reads: the server's English name, or the tag itself.
  }
  if (name) return name.charAt(0).toUpperCase() + name.slice(1);
  return (typeof language === 'string' ? null : language.name) ?? tag;
}

/** The primary language subtag of a `Locale` or a BCP 47 string, lower-cased: `fr` for `fr-CA`. */
export function baseLanguage(language) {
  const tag = typeof language === 'string' ? language : language?.tag;
  return tag ? tag.split('-')[0].toLowerCase() : null;
}

export function seasonCount(count) {
  return i18n.t('{{count}} season', { count });
}

export function episodeCount(count) {
  return i18n.t('{{count}} episode', { count });
}

export function seasonLabel(season) {
  if (!season) return '';
  if (season.title && !/^(season|saison)\s*\d+$/i.test(season.title)) return season.title;
  return season.number === 0 ? i18n.t('Specials') : i18n.t('Season {{number}}', { number: season.number });
}

export function episodeCode(seasonNumber, episodeNumber) {
  if (episodeNumber == null) return '';
  if (seasonNumber == null) return i18n.t('E{{episode}}', { episode: episodeNumber });
  return i18n.t('S{{season}} · E{{episode}}', { season: seasonNumber, episode: episodeNumber });
}

export function progressRatio(watchState, durationMs) {
  if (!watchState?.offsetMs || !durationMs) return 0;
  return Math.min(1, watchState.offsetMs / durationMs);
}

/** Player clock: `1:02:03`, `4:05`. */
export function formatClock(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}
