import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { formatNumber } from '../../utils/format';
import styles from './JumpBar.module.css';

/** The buckets drawn one per letter; the others (Œ, Greek, Cyrillic…) share a last one. */
const OWN = /^[#A-Z]$/;

/**
 * Where each letter starts in a title-ordered listing of `buckets` (as the server counts
 * them, `#` then A–Z, then the rest), read in `direction`.
 */
export function letterOffsets(buckets, direction) {
  const merged = [];
  for (const { character, count } of buckets) {
    if (OWN.test(character)) merged.push({ character, count });
    else if (merged.at(-1)?.other) merged.at(-1).count += count;
    else merged.push({ character: '…', count, other: true });
  }
  const ordered = direction === 'DESCENDING' ? merged.reverse() : merged;
  let offset = 0;
  return ordered
    .filter((b) => b.count > 0)
    .map((b) => {
      const entry = { ...b, offset };
      offset += b.count;
      return entry;
    });
}

/**
 * The A–Z bar beside a title-ordered listing, as in Plex: a letter jumps to its first item;
 * dragging along the bar runs through them. `letters` come from `letterOffsets`.
 */
export default function JumpBar({ letters, current, onJump }) {
  const { t } = useTranslation();
  const dragging = useRef(null);

  const active = letters.reduce((found, l) => (l.offset <= current ? l : found), letters[0]);

  // Read against where the letters were when the finger went down: the first jump can move
  // the bar (it sticks under the top bar once the page scrolls), and the letter now under the
  // finger would jump again, and again.
  const jumpAt = (e) => {
    const { spots } = dragging.current;
    const y = Math.min(Math.max(e.clientY, spots[0].top), spots.at(-1).bottom - 1);
    const spot = spots.find((s) => y >= s.top && y < s.bottom) ?? spots.at(-1);
    if (spot.offset !== dragging.current.last) {
      dragging.current.last = spot.offset;
      onJump(spot.offset);
    }
  };

  return (
    <nav className={styles.bar} aria-label={t('Jump to a letter')}>
      <div
        className={styles.letters}
        onPointerDown={(e) => {
          if (e.pointerType === 'mouse') return;
          // A finger runs down the bar; the letters follow it.
          const spots = [...e.currentTarget.querySelectorAll('[data-offset]')].map((b) => {
            const r = b.getBoundingClientRect();
            return { top: r.top, bottom: r.bottom, offset: Number(b.dataset.offset) };
          });
          if (!spots.length) return;
          dragging.current = { spots, last: null };
          e.currentTarget.setPointerCapture(e.pointerId);
          jumpAt(e);
        }}
        onPointerMove={(e) => dragging.current && jumpAt(e)}
        onPointerUp={() => (dragging.current = null)}
        onPointerCancel={() => (dragging.current = null)}
      >
        {letters.map((l) => (
          <button
            key={l.character}
            type="button"
            className={styles.letter}
            data-offset={l.offset}
            aria-current={l === active ? 'true' : undefined}
            title={`${l.other ? t('Other letters') : l.character} · ${t('{{formattedCount}} item', { count: l.count, formattedCount: formatNumber(l.count) })}`}
            aria-label={l.other ? t('Other letters') : l.character}
            onClick={() => onJump(l.offset)}
          >
            {l.character}
          </button>
        ))}
      </div>
    </nav>
  );
}
