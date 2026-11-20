import { useEffect } from 'react';
import { Outlet, useLocation, useNavigationType } from 'react-router';
import { savedScroll } from '../../utils/scrollMemory';
import TopBar from '../TopBar/TopBar';
import styles from './Layout.module.css';

/**
 * Scrolls to the top on a new page; links that only change a part of it pass
 * `state.keepScroll`. Back on an entry that remembers its position, that page restores it.
 */
function ScrollToTop() {
  const location = useLocation();
  const { pathname, state } = location;
  const navigationType = useNavigationType();
  const keep = !!state?.keepScroll || (navigationType === 'POP' && savedScroll(location) !== null);
  useEffect(() => {
    if (!keep) window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname, keep]);
  return null;
}

export default function Layout() {
  return (
    <div className={styles.app}>
      <ScrollToTop />
      <TopBar />
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
