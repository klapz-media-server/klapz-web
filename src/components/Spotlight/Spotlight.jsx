import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { artworkUrl } from '../../utils/artwork';
import { formatContentRating, formatDuration, seasonCount } from '../../utils/format';
import { itemPath } from '../../utils/routes';
import Icon from '../Icon/Icon';
import MetaLine from '../MetaLine/MetaLine';
import TitleLogo from '../TitleLogo/TitleLogo';
import styles from './Spotlight.module.css';

const INTERVAL = 9000;

/** Home page hero: rotating featured titles over their background art. */
export default function Spotlight({ items }) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = items.length;

  useEffect(() => {
    if (paused || count < 2) return undefined;
    const timer = setTimeout(() => setIndex((i) => (i + 1) % count), INTERVAL);
    return () => clearTimeout(timer);
  }, [index, paused, count]);

  if (!count) return <div className={styles.empty} />;
  const current = items[index % count];
  const genres = current.tags?.genres?.nodes?.map((g) => g.name).join(', ');
  const meta = [
    current.year,
    current.__typename === 'Movie'
      ? formatDuration(current.durationMs)
      : current.stats?.seasonCount && seasonCount(current.stats.seasonCount),
    genres,
  ];

  return (
    <section
      className={styles.spotlight}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription={t('carousel')}
      aria-label={t('Featured')}
    >
      <div className={styles.slides} aria-hidden="true">
        {items.map((item, i) => {
          const src = artworkUrl(item, 'background', 'background');
          return (
            <div
              key={item.id}
              className={styles.slide}
              data-active={i === index || undefined}
              style={src ? { backgroundImage: `url("${src}")` } : undefined}
            />
          );
        })}
        <div className={styles.shade} />
      </div>

      <div className={styles.content} key={current.id}>
        <span className={styles.kicker}>{t('Featured')}</span>
        <TitleLogo item={current} title={current.title} />
        <MetaLine badge={formatContentRating(current.contentRating)} items={meta} />
        {current.summary && <p className={styles.summary}>{current.summary}</p>}
        <div className={styles.actions}>
          <Link to={itemPath(current)} className={styles.primary}>
            <Icon name="play" size={18} />
            {t('View title')}
          </Link>
          <Link to={itemPath(current)} className={styles.secondary}>
            <Icon name="info" size={18} />
            {t('More info')}
          </Link>
        </div>
      </div>

      {count > 1 && (
        <div className={styles.dots}>
          {items.map((item, i) => (
            <button
              key={item.id}
              type="button"
              className={styles.dot}
              data-active={i === index || undefined}
              aria-label={t('Show {{title}}', { title: item.title })}
              onClick={() => setIndex(i)}
            >
              {i === index && !paused && <span className={styles.dotProgress} style={{ animationDuration: `${INTERVAL}ms` }} />}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
