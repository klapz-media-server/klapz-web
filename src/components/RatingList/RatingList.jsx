import { useTranslation } from 'react-i18next';
import styles from './RatingList.module.css';

const SOURCES = {
  imdb: { AUDIENCE: { label: () => 'IMDb', tone: 'imdb', format: (v) => v.toFixed(1) } },
  rottentomatoes: {
    CRITIC: { label: (t) => t('Critics'), tone: 'critic', format: (v) => `${Math.round(v * 10)}%` },
    AUDIENCE: { label: (t) => t('Audience'), tone: 'audience', format: (v) => `${Math.round(v * 10)}%` },
  },
  themoviedb: { AUDIENCE: { label: () => 'TMDB', tone: 'tmdb', format: (v) => v.toFixed(1) } },
};

/** Ratings row (IMDb, critics, audience, TMDB) under the title. */
export default function RatingList({ ratings, fallback }) {
  const { t } = useTranslation();
  const items = (ratings ?? [])
    .map((r) => {
      const def = SOURCES[r.source]?.[r.kind];
      return def ? { key: `${r.source}-${r.kind}`, ...def, label: def.label(t), value: def.format(r.value) } : null;
    })
    .filter(Boolean);

  if (!items.length && fallback) {
    items.push({ key: 'fallback', label: t('Rating'), tone: 'imdb', value: fallback.toFixed(1) });
  }
  if (!items.length) return null;

  return (
    <ul className={styles.list} aria-label={t('Ratings')}>
      {items.map((item) => (
        <li key={item.key} className={styles.item} title={item.label}>
          <span className={styles.badge} data-tone={item.tone}>
            {item.tone === 'imdb' ? item.label : <span className={styles.dot} />}
          </span>
          <span className={styles.value}>{item.value}</span>
          {item.tone !== 'imdb' && <span className={styles.source}>{item.label}</span>}
        </li>
      ))}
    </ul>
  );
}
