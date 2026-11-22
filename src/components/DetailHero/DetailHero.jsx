import { Link } from 'react-router';
import ExpandableText from '../ExpandableText/ExpandableText';
import MetaLine from '../MetaLine/MetaLine';
import RatingList from '../RatingList/RatingList';
import TagList from '../TagList/TagList';
import TitleLogo from '../TitleLogo/TitleLogo';
import styles from './DetailHero.module.css';

/**
 * Header block of a movie / show page, laid out like watch.plex.tv:
 * logo or title, meta line, ratings, actions, summary and credits, over
 * the page backdrop.
 */
export default function DetailHero({
  item,
  title,
  eyebrow,
  tagline,
  badge,
  meta,
  ratings,
  fallbackRating,
  tags,
  primaryAction,
  actions,
  summary,
  credits,
}) {
  return (
    <section className={styles.hero}>
      {eyebrow && (
        <p className={styles.eyebrow}>
          {eyebrow.to ? <Link to={eyebrow.to}>{eyebrow.label}</Link> : eyebrow.label}
        </p>
      )}
      <TitleLogo item={item} title={title} />
      <div className={styles.metaBlock}>
        <MetaLine badge={badge} items={meta} />
        <RatingList ratings={ratings} fallback={fallbackRating} />
        {tags?.length > 0 && <TagList tags={tags} size="sm" label="Genres" />}
      </div>
      {(primaryAction || actions) && (
        <div className={styles.actions}>
          {primaryAction}
          {actions && <div className={styles.roundActions}>{actions}</div>}
        </div>
      )}
      {tagline && <p className={styles.tagline}>{tagline}</p>}
      <ExpandableText text={summary} lines={4} className={styles.summary} />
      {credits?.length > 0 && (
        <dl className={styles.credits}>
          {credits.map(({ label, people }) => (
            <div key={label} className={styles.creditRow}>
              <dt>{label}</dt>
              <dd>
                {people.map((p, i) => (
                  <span key={p.key}>
                    {i > 0 && ', '}
                    {p.to ? <Link to={p.to}>{p.name}</Link> : p.name}
                  </span>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
