import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import Icon from '../Icon/Icon';
import styles from './Slider.module.css';

/**
 * A horizontal row of cards with a title, an optional "see all" link and
 * paging arrows that appear on hover.
 */
export default function Slider({ title, subtitle, to, children, className, loading = false }) {
  const { t } = useTranslation();
  const trackRef = useRef(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  const update = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setEdges({
      start: el.scrollLeft <= 4,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4,
    });
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return undefined;
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
    };
  }, [update, children]);

  const page = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' });
  };

  const heading = to ? (
    <Link to={to} className={styles.titleLink}>
      {title}
      <Icon name="chevronRight" size={18} className={styles.titleChevron} />
    </Link>
  ) : (
    title
  );

  return (
    <section className={[styles.slider, className].filter(Boolean).join(' ')}>
      {title && (
        <header className={styles.header}>
          <h2 className={styles.title}>{heading}</h2>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </header>
      )}
      <div className={styles.viewport}>
        <button
          type="button"
          className={`${styles.arrow} ${styles.arrowPrev}`}
          onClick={() => page(-1)}
          hidden={edges.start}
          aria-label={t('Previous')}
          tabIndex={-1}
        >
          <Icon name="chevronLeft" size={26} />
        </button>
        <div ref={trackRef} className={styles.track} data-loading={loading || undefined}>
          {children}
        </div>
        <button
          type="button"
          className={`${styles.arrow} ${styles.arrowNext}`}
          onClick={() => page(1)}
          hidden={edges.end}
          aria-label={t('Next')}
          tabIndex={-1}
        >
          <Icon name="chevronRight" size={26} />
        </button>
      </div>
    </section>
  );
}
