import { useEffect } from 'react';
import { Link, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useWatchToggle } from '../../hooks/useWatchToggle';
import { formatDay, formatDuration, formatRemaining, progressRatio } from '../../utils/format';
import { playPath } from '../../utils/routes';
import Artwork from '../Artwork/Artwork';
import EmptyState from '../EmptyState/EmptyState';
import Icon from '../Icon/Icon';
import ProgressBar from '../ProgressBar/ProgressBar';
import styles from './EpisodeList.module.css';

function EpisodeRow({ episode, onEdit }) {
  const { t } = useTranslation();
  const watch = useWatchToggle(episode);
  const progress = progressRatio(episode.watchState, episode.durationMs);
  const remaining = progress > 0 ? formatRemaining(episode.durationMs, episode.watchState.offsetMs) : null;
  const title = episode.title || t('Episode {{number}}', { number: episode.number });

  return (
    <li id={`e-${episode.id}`} className={styles.row}>
      <Link className={styles.thumb} to={playPath(episode, episode.watchState?.isWatched ? 0 : episode.watchState?.offsetMs)} aria-label={t('Play {{title}}', { title })}>
        <Artwork guid={episode.guid} type="thumb" size="thumb" ratio="16 / 9" title={title} placeholderIcon="tv" />
        <span className={styles.play} aria-hidden="true">
          <Icon name="play" size={20} />
        </span>
        {progress > 0 && <ProgressBar value={progress} className={styles.progress} />}
      </Link>
      <div className={styles.body}>
        <div className={styles.heading}>
          <span className={styles.number}>{episode.number}</span>
          <h3 className={styles.title}>{title}</h3>
          <button
            type="button"
            className={styles.watched}
            data-watched={watch.isWatched || undefined}
            onClick={watch.toggle}
            disabled={watch.loading}
            title={watch.isWatched ? t('Mark as unwatched') : t('Mark as watched')}
            aria-pressed={watch.isWatched}
          >
            <Icon name={watch.isWatched ? 'checkCircle' : 'check'} size={18} />
          </button>
          {onEdit && (
            <button
              type="button"
              className={styles.watched}
              onClick={() => onEdit({ ...episode, __typename: 'Episode' })}
              title={t('Edit {{title}}', { title })}
              aria-label={t('Edit {{title}}', { title })}
            >
              <Icon name="edit" size={17} />
            </button>
          )}
        </div>
        <p className={styles.meta}>
          {[formatDuration(episode.durationMs), remaining, formatDay(episode.releasedOn)].filter(Boolean).join(' · ')}
        </p>
        {episode.summary && <p className={styles.summary}>{episode.summary}</p>}
      </div>
    </li>
  );
}

/** Episodes of a season, as large rows with thumbnails. `onEdit(episode)` offers editing each. */
export default function EpisodeList({ episodes, onEdit }) {
  const { t } = useTranslation();
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) return;
    const el = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [location.hash, episodes]);

  if (!episodes.length) {
    return (
      <EmptyState
        variant="compact"
        icon="tv"
        title={t('No episodes in this season')}
        description={t('Its episodes appear here once their files are scanned.')}
        className={styles.empty}
      />
    );
  }
  return (
    <ol className={styles.list}>
      {episodes.map((episode) => (
        <EpisodeRow key={episode.id} episode={episode} onEdit={onEdit} />
      ))}
    </ol>
  );
}
