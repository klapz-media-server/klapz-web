import { Link } from 'react-router';
import styles from './TagList.module.css';

/**
 * Pill-shaped tags, as in the genre row of watch.plex.tv.
 *
 * Each tag is `{ key, label, to?, onClick?, active? }`. With `scroll`, the
 * list stays on one line and scrolls horizontally.
 */
export default function TagList({ tags, scroll = false, size = 'md', className, label }) {
  if (!tags?.length) return null;
  return (
    <ul
      className={[styles.list, className].filter(Boolean).join(' ')}
      data-scroll={scroll || undefined}
      data-size={size}
      aria-label={label}
    >
      {tags.map((tag) => {
        const props = {
          className: styles.tag,
          'data-active': tag.active || undefined,
          'aria-current': tag.active ? 'true' : undefined,
        };
        return (
          <li key={tag.key} className={styles.item}>
            {tag.to ? (
              <Link to={tag.to} {...props}>
                {tag.label}
              </Link>
            ) : (
              <button type="button" onClick={tag.onClick} {...props}>
                {tag.label}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
