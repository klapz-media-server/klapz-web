import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import TopBar from '../TopBar/TopBar';
import styles from './Layout.module.css';

/** Scrolls to the top on a new page; links that only change a part of it pass `state.keepScroll`. */
function ScrollToTop() {
  const { pathname, state } = useLocation();
  const keep = !!state?.keepScroll;
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
