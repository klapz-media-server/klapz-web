import Icon from '../Icon/Icon';
import styles from './EmptyState.module.css';

/**
 * What a screen shows when it has nothing to list: an icon, a title, a line on why and what to
 * do, and the actions that help, when the viewer may take them.
 *
 * `variant`: `page` (centered, for a page or a large area) or `compact` (a framed block inside a
 * section). `busy` turns the icon into a spinner, for a state that will change by itself, such as
 * a scan. `live` announces changes to screen readers (`role="status"`); leave it off for a state
 * that is there from the first render. `children` go between the description and the actions,
 * for details such as a list of folders.
 */
export default function EmptyState({
  icon = 'info',
  title,
  description,
  actions,
  children,
  variant = 'page',
  busy = false,
  live = false,
  className,
}) {
  const compact = variant === 'compact';
  const Title = compact ? 'p' : 'h2';
  return (
    <div
      className={[styles.box, className].filter(Boolean).join(' ')}
      data-variant={variant}
      role={live ? 'status' : undefined}
    >
      <span className={styles.icon} data-busy={busy || undefined} aria-hidden="true">
        {busy ? <span className={styles.spinner} /> : <Icon name={icon} size={compact ? 20 : 28} />}
      </span>
      <div className={styles.text}>
        {title && <Title className={styles.title}>{title}</Title>}
        {description && <p className={styles.description}>{description}</p>}
      </div>
      {children && <div className={styles.details}>{children}</div>}
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  );
}
