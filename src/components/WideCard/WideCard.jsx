import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { formatRemaining, progressRatio } from '../../utils/format';
import { itemPath } from '../../utils/routes';
import Artwork from '../Artwork/Artwork';
import Icon from '../Icon/Icon';
import { describeItem } from '../PosterCard/PosterCard';
import ProgressBar from '../ProgressBar/ProgressBar';
import styles from './WideCard.module.css';

/**
 * A 16:9 card — used for "continue watching" and episode thumbnails, like
 * the landscape rows of watch.plex.tv.
 */
export default function WideCard({ item, label }) {
  useTranslation();
  const { title, subtitle } = describeItem(item);
  const isEpisode = item.__typename === 'Episode';
  const type = isEpisode ? 'thumb' : 'background';
  const progress = progressRatio(item.watchState, item.durationMs);
  const remaining = formatRemaining(item.durationMs, item.watchState?.offsetMs);

  return (
    <Link to={itemPath(item)} className={styles.card} title={title}>
      <div className={styles.imageWrap}>
        <Artwork
          guid={item.guid}
          type={type}
          size="thumb"
          ratio="16 / 9"
          title={title}
          placeholderIcon={isEpisode ? 'tv' : 'movie'}
        />
        {label && <span className={styles.label}>{label}</span>}
        <span className={styles.hover} aria-hidden="true">
          <span className={styles.playButton}>
            <Icon name="play" size={20} />
          </span>
        </span>
        {progress > 0 && <ProgressBar value={progress} className={styles.progress} />}
      </div>
      <span className={styles.title}>{title}</span>
      <span className={styles.subtitle}>{remaining ?? subtitle}</span>
    </Link>
  );
}
