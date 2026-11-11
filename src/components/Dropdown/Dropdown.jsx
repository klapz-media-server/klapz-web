import { useEffect, useId, useRef, useState } from 'react';
import Icon from '../Icon/Icon';
import styles from './Dropdown.module.css';

/**
 * A pill button opening a floating menu. `children` receives a `close`
 * callback so menu items can dismiss it.
 */
export default function Dropdown({ label, icon, active = false, align = 'start', children, buttonClassName }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={[styles.button, buttonClassName].filter(Boolean).join(' ')}
        data-active={active || open || undefined}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((o) => !o)}
      >
        {icon && <Icon name={icon} size={18} />}
        <span className={styles.label}>{label}</span>
        <Icon name="chevronDown" size={16} className={styles.chevron} />
      </button>
      {open && (
        <div id={menuId} className={styles.menu} data-align={align} role="menu">
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export function DropdownItem({ as: Component = 'button', active, children, ...props }) {
  return (
    <Component
      role="menuitem"
      className={styles.item}
      data-active={active || undefined}
      {...(Component === 'button' ? { type: 'button' } : {})}
      {...props}
    >
      <span className={styles.itemLabel}>{children}</span>
      {active && <Icon name="check" size={16} className={styles.itemCheck} />}
    </Component>
  );
}

export function DropdownHeading({ children }) {
  return <div className={styles.heading}>{children}</div>;
}
