import { useState } from 'react';
import { NavLink, useLocation } from 'react-router';
import Icon from '../Icon/Icon';
import styles from './SidebarLayout.module.css';

function NavItem({ item, nested = false }) {
  return (
    <NavLink to={item.to} className={styles.navLink} data-nested={nested || undefined} state={{ keepScroll: true }}>
      {item.icon && <Icon name={item.icon} size={18} />}
      {item.label}
      {item.badge > 0 && <span className={styles.badge}>{item.badge}</span>}
    </NavLink>
  );
}

/** An entry that unfolds into its own sections. Open while one of them is shown. */
function NavGroup({ item }) {
  const { pathname } = useLocation();
  const current = item.children.some((child) => pathname.startsWith(child.to));
  const [unfolded, setUnfolded] = useState(current);
  const open = unfolded || current;
  return (
    <div className={styles.group} data-open={open || undefined}>
      <button
        type="button"
        className={styles.navLink}
        data-current={current || undefined}
        aria-expanded={open}
        onClick={() => setUnfolded(!open)}
      >
        <Icon name={item.icon} size={18} />
        {item.label}
        <Icon name="chevronDown" size={16} className={styles.chevron} />
      </button>
      {open && (
        <div className={styles.children}>
          {item.children.map((child) => (
            <NavItem key={child.to} item={child} nested />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * A page of settings: its title, a menu of its sections on the left (above, on narrow screens),
 * and the current section. `items` are `{ to, icon, label, badge? }`, or `{ icon, label,
 * children }` for an entry unfolding into sections of its own.
 */
export default function SidebarLayout({ title, items, children }) {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{title}</h1>
      <div className={styles.layout}>
        <nav className={styles.nav} aria-label={title}>
          {items.map((item) =>
            item.children ? <NavGroup key={item.label} item={item} /> : <NavItem key={item.to} item={item} />,
          )}
        </nav>
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}
