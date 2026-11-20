import { useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigationType } from 'react-router';
import { savedScroll, saveScroll } from '../../utils/scrollMemory';
import PosterCard from '../PosterCard/PosterCard';
import styles from './VirtualPosterGrid.module.css';

/** Rows rendered above and below the view, so a slow scroll never shows an empty row. */
const OVERSCAN = 2;
/** Rows beyond the visible ones whose pages are asked for with them. */
const FETCH_MARGIN = 1;
/** How long the scroll must rest before pages are asked for: a fling, or a slow drag of the
 * scrollbar, asks for none on its way. */
const SETTLE_MS = 160;
/** A letter's jump: the last stretch is animated, from this many screens away at most. */
const GLIDE_SCREENS = 1.5;
const GLIDE_MS = 420;
const easeOut = (t) => 1 - (1 - t) ** 3;
/** Space under a poster for its title and subtitle, until a card has been measured. */
const TEXT_ESTIMATE = 46;

function readLayout(el) {
  const css = getComputedStyle(el);
  const width = el.clientWidth - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight);
  const posterW = parseFloat(css.getPropertyValue('--poster-w')) || 168;
  const colGap = parseFloat(css.columnGap) || 16;
  const rowGap = parseFloat(css.rowGap) || 28;
  // As `repeat(auto-fill, minmax(var(--poster-w), 1fr))` would lay them out.
  const cols = Math.max(1, Math.floor((width + colGap) / (posterW + colGap)));
  return { cols, cellW: (width - (cols - 1) * colGap) / cols, rowGap };
}

/**
 * A poster grid of `total` items laid out at once but rendered only around the view: the
 * page keeps the full height, so the scrollbar and the jump bar address any position, and
 * only the visible cards — and their images — exist.
 *
 * `item(index)` gives the item at an index or undefined while it loads; `onRange(from, to)`
 * is told which indexes are in view once the scroll settles; `onFirstVisible(index)` follows
 * the top of the view: the last index of its first row, the one a jump bar names. `ref` exposes `scrollToIndex(index)`. `resetKey` changes with the
 * listing, which brings a scrolled page back to the grid's top.
 */
export default function VirtualPosterGrid({ ref, total, item, onRange, onFirstVisible, resetKey, className }) {
  const gridRef = useRef(null);
  const [layout, setLayout] = useState(null);
  const [textH, setTextH] = useState(TEXT_ESTIMATE);
  // Rendered rows, and the visible ones within them.
  const [rows, setRows] = useState({ start: 0, end: 0, first: 0, last: 0 });
  const glide = useRef(null);
  const location = useLocation();
  const navigationType = useNavigationType();
  const restore = useRef(navigationType === 'POP' ? savedScroll(location) : null);

  const rowH = layout ? layout.cellW * 1.5 + textH + layout.rowGap : 0;
  const rowCount = layout ? Math.ceil(total / layout.cols) : 0;
  const height = rowCount ? rowCount * rowH - layout.rowGap : 0;

  useLayoutEffect(() => {
    const el = gridRef.current;
    const observer = new ResizeObserver(() => {
      const next = readLayout(el);
      setLayout((prev) => (prev && prev.cols === next.cols && prev.cellW === next.cellW && prev.rowGap === next.rowGap ? prev : next));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Which rows are in view, recomputed on scroll and whenever the geometry changes.
  const measure = useRef(() => {});
  measure.current = () => {
    const el = gridRef.current;
    if (!el || !rowH) return;
    const top = el.getBoundingClientRect().top;
    const first = Math.max(0, Math.floor(-top / rowH));
    const last = Math.min(rowCount, Math.ceil((window.innerHeight - top) / rowH));
    const start = Math.max(0, first - OVERSCAN);
    const end = Math.min(rowCount, last + OVERSCAN);
    setRows((prev) => (prev.start === start && prev.end === end && prev.first === first && prev.last === last ? prev : { start, end, first, last }));
    const topbar = parseFloat(getComputedStyle(el).getPropertyValue('--topbar-h')) || 64;
    // The first row at least half below the top bar.
    const firstRow = Math.min(Math.max(0, rowCount - 1), Math.max(0, Math.ceil((topbar - top - rowH / 2) / rowH)));
    onFirstVisible?.(Math.min(total - 1, firstRow * layout.cols + layout.cols - 1));
  };

  useLayoutEffect(() => {
    // Coming back to this entry: where the user left it, now that the grid has its height.
    if (restore.current !== null && height) {
      window.scrollTo({ top: restore.current, behavior: 'instant' });
      restore.current = null;
    }
    measure.current();
  }, [rowH, rowCount, height]);

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => measure.current());
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  // Remember the position for a return to this entry. Followed as it scrolls: by the time
  // an unmount runs, the grid is out of the document and the page has shrunk back to the top.
  const lastY = useRef(0);
  useEffect(() => {
    const here = location;
    const onScroll = () => (lastY.current = window.scrollY);
    const onHide = () => saveScroll(here, lastY.current);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pagehide', onHide);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pagehide', onHide);
      onHide();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key, location.pathname, location.search]);

  // Another listing: back to its top if the page was scrolled past it.
  const firstReset = useRef(true);
  useEffect(() => {
    if (firstReset.current) {
      firstReset.current = false;
      return;
    }
    const el = gridRef.current;
    const topbar = parseFloat(getComputedStyle(el).getPropertyValue('--topbar-h')) || 64;
    const top = el.getBoundingClientRect().top;
    if (top < topbar) window.scrollTo({ top: window.scrollY + top - topbar - 160, behavior: 'instant' });
  }, [resetKey]);

  // Ask for the visible pages once the scroll rests there — or as soon as a glide lands.
  const fetchVisible = useRef(() => {});
  fetchVisible.current = () => {
    const el = gridRef.current;
    if (!el || !layout || !rowH) return;
    const top = el.getBoundingClientRect().top;
    const first = Math.max(0, Math.floor(-top / rowH) - FETCH_MARGIN);
    const last = Math.min(rowCount, Math.ceil((window.innerHeight - top) / rowH) + FETCH_MARGIN);
    if (last > first) onRange(first * layout.cols, Math.min(total, last * layout.cols));
  };
  useEffect(() => {
    if (glide.current || rows.last <= rows.first) return undefined;
    const timer = setTimeout(() => fetchVisible.current(), SETTLE_MS);
    return () => clearTimeout(timer);
  }, [rows.first, rows.last, layout, total, onRange]);
  const landed = () => {
    glide.current = null;
    fetchVisible.current();
  };

  // A glide gives way to the user: a wheel, a touch or a key stops it where it is.
  useEffect(() => {
    const stop = () => {
      if (!glide.current) return;
      cancelAnimationFrame(glide.current);
      landed();
    };
    const events = ['wheel', 'touchstart', 'keydown', 'mousedown'];
    for (const name of events) window.addEventListener(name, stop, { passive: true });
    return () => {
      for (const name of events) window.removeEventListener(name, stop);
      if (glide.current) cancelAnimationFrame(glide.current);
    };
  }, []);

  const glideTo = (target) => {
    if (glide.current) cancelAnimationFrame(glide.current);
    glide.current = null;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    target = Math.max(0, Math.min(max, target));
    let from = window.scrollY;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || Math.abs(target - from) < 2) {
      window.scrollTo({ top: target, behavior: 'instant' });
      requestAnimationFrame(() => fetchVisible.current());
      return;
    }
    // Across thousands of rows, only the end is animated: the rows on the way would each be
    // drawn for a frame, for nothing.
    const reach = window.innerHeight * GLIDE_SCREENS;
    if (Math.abs(target - from) > reach) {
      from = target - Math.sign(target - from) * reach;
      window.scrollTo({ top: from, behavior: 'instant' });
    }
    const began = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - began) / GLIDE_MS);
      window.scrollTo({ top: from + (target - from) * easeOut(t), behavior: 'instant' });
      if (t < 1) {
        glide.current = requestAnimationFrame(step);
      } else {
        landed();
      }
    };
    glide.current = requestAnimationFrame(step);
  };

  useImperativeHandle(
    ref,
    () => ({
      scrollToIndex(index) {
        const el = gridRef.current;
        if (!el || !layout) return;
        const topbar = parseFloat(getComputedStyle(el).getPropertyValue('--topbar-h')) || 64;
        const top = el.getBoundingClientRect().top + window.scrollY;
        glideTo(top + Math.floor(index / layout.cols) * rowH - topbar - 12);
      },
    }),
    [layout, rowH],
  );

  // A card's text block can be taller than estimated (a larger font): measure one.
  useLayoutEffect(() => {
    if (!layout) return;
    const card = gridRef.current.querySelector('[data-measure] a');
    if (!card) return;
    const text = card.offsetHeight - layout.cellW * 1.5;
    if (text > textH + 0.5) setTextH(Math.ceil(text));
  });

  const cells = [];
  if (layout) {
    const from = rows.start * layout.cols;
    const to = Math.min(total, rows.end * layout.cols);
    for (let index = from; index < to; index++) {
      const it = item(index);
      cells.push(
        it ? (
          <div key={index} className={styles.cell} data-index={index} data-measure={index === from || undefined}>
            <PosterCard item={it} fluid />
          </div>
        ) : (
          <div key={index} className={styles.skeleton} data-index={index} aria-hidden="true">
            <div className={styles.skeletonPoster} />
            <div className={styles.skeletonLine} />
          </div>
        ),
      );
    }
  }

  return (
    <div ref={gridRef} className={[styles.frame, className].filter(Boolean).join(' ')} style={{ height }}>
      {layout && (
        <div
          className={styles.window}
          style={{
            transform: `translateY(${rows.start * rowH}px)`,
            gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))`,
            gridAutoRows: `${rowH - layout.rowGap}px`,
          }}
        >
          {cells}
        </div>
      )}
    </div>
  );
}
