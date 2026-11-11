import { forwardRef } from 'react';
import Icon from '../Icon/Icon';
import styles from './PlayerIconButton.module.css';

/**
 * Round, borderless player button with a tooltip. `badge` overlays a short
 * text on the icon (the "10" / "30" of the skip buttons).
 */
const PlayerIconButton = forwardRef(function PlayerIconButton(
  { icon, label, onClick, active, badge, size = 'md', tooltip = 'top', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={styles.button}
      data-size={size}
      data-active={active || undefined}
      aria-label={label}
      onClick={onClick}
      {...props}
    >
      <span className={styles.iconWrap}>
        <Icon name={icon} size={size === 'lg' ? 34 : size === 'sm' ? 20 : 24} />
        {badge && <span className={styles.badge}>{badge}</span>}
      </span>
      <span className={styles.tooltip} data-position={tooltip} aria-hidden="true">
        {label}
      </span>
    </button>
  );
});

export default PlayerIconButton;
