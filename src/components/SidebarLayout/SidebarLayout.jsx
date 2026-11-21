import { NavLink } from 'react-router';
import Icon from '../Icon/Icon';
import styles from './SidebarLayout.module.css';

/**
 * A page of settings: its title, a menu of its sections on the left (above, on narrow screens),
 * and the current section. `items` are `{ to, icon, label, badge? }`.
 */
export default function SidebarLayout({ title, items, children }) {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{title}</h1>
      <div className={styles.layout}>
        <nav className={styles.nav} aria-label={title}>
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} className={styles.navLink} state={{ keepScroll: true }}>
              <Icon name={item.icon} size={18} />
              {item.label}
              {item.badge > 0 && <span className={styles.badge}>{item.badge}</span>}
            </NavLink>
          ))}
        </nav>
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}
