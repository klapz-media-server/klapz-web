import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { episodeCode, progressRatio, seasonCount, seasonLabel } from '../../utils/format';
import { itemPath } from '../../utils/routes';
import Artwork from '../Artwork/Artwork';
import Icon from '../Icon/Icon';
import ProgressBar from '../ProgressBar/ProgressBar';
import styles from './PosterCard.module.css';

export function describeItem(item) {
  switch (item.__typename) {
    case 'Season':
      return {
        title: item.show?.title ?? seasonLabel(item),
        subtitle: seasonLabel(item),
        guid: item.guid,
        fallbackGuid: item.show?.guid,
      };
    case 'Episode':
      return {
        title: item.show?.title ?? item.title,
        subtitle: [episodeCode(item.season?.number, item.number), item.title].filter(Boolean).join(' — '),
        guid: item.season?.guid ?? item.show?.guid,
        fallbackGuid: item.show?.guid,
      };
    case 'Show': {
      const seasons = item.stats?.seasonCount;
      return {
        title: item.title,
        subtitle: seasons ? seasonCount(seasons) : item.year,
        guid: item.guid,
      };
    }
    default:
      return { title: item.title, subtitle: item.year, guid: item.guid };
  }
}

/** A 2:3 poster with title and subtitle, as in the Plex library grids. */
export default function PosterCard({ item, fluid = false, active = false, replace = false, title: titleOverride, subtitle: subtitleOverride }) {
  const { t } = useTranslation();
  const described = describeItem(item);
  const title = titleOverride ?? described.title;
  const subtitle = subtitleOverride ?? described.subtitle;
  const { guid } = described;
  const progress = progressRatio(item.watchState, item.durationMs);
  const unwatched =
    item.__typename === 'Show' && item.stats
      ? item.stats.episodeCount - item.stats.watchedEpisodeCount
      : null;
  const watched = item.watchState?.isWatched;

  return (
    <Link
      to={itemPath(item)}
      className={styles.card}
      data-fluid={fluid || undefined}
      data-active={active || undefined}
      aria-current={active ? 'true' : undefined}
      replace={replace}
      state={replace ? { keepScroll: true } : undefined}
      preventScrollReset={replace}
      title={title}
    >
      <div className={styles.posterWrap}>
        <Artwork
          guid={guid}
          type="poster"
          title={title}
          placeholderIcon={item.__typename === 'Movie' ? 'movie' : 'tv'}
          className={styles.poster}
        />
        {watched && (
          <span className={styles.badgeWatched} aria-label={t('Watched')}>
            <Icon name="check" size={14} />
          </span>
        )}
        {!watched && unwatched > 0 && unwatched < item.stats.episodeCount && (
          <span className={styles.badgeCount}>{unwatched}</span>
        )}
        {progress > 0 && <ProgressBar value={progress} className={styles.progress} />}
        <span className={styles.hover} aria-hidden="true">
          <span className={styles.playButton}>
            <Icon name="play" size={22} />
          </span>
        </span>
      </div>
      <span className={styles.title}>{title}</span>
      {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
    </Link>
  );
}
