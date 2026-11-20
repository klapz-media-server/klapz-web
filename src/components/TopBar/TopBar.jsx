import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useMatch, useNavigate } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { useTranslation } from 'react-i18next';
import { LIBRARIES } from '../../graphql/queries';
import { libraryPath, readParam } from '../../utils/routes';
import Dropdown, { DropdownHeading, DropdownItem } from '../Dropdown/Dropdown';
import AccountMenu from '../AccountMenu/AccountMenu';
import Icon from '../Icon/Icon';
import Logo from '../Logo/Logo';
import SearchBox from '../SearchBox/SearchBox';
import styles from './TopBar.module.css';

function LibraryMenu({ label, icon, libraries, currentId }) {
  const navigate = useNavigate();
  if (!libraries.length) return null;
  const active = libraries.some((l) => l.id === currentId);
  return (
    <Dropdown label={label} icon={icon} active={active}>
      {(close) => (
        <>
          <DropdownHeading>{label}</DropdownHeading>
          {libraries.map((lib) => (
            <DropdownItem
              key={lib.id}
              active={lib.id === currentId}
              onClick={() => {
                close();
                navigate(libraryPath(lib.id));
              }}
            >
              {lib.title}
            </DropdownItem>
          ))}
        </>
      )}
    </Dropdown>
  );
}

/**
 * Top navigation in the style of watch.plex.tv: logo, search pill and
 * pill-shaped links, transparent over the hero and solid once scrolled.
 */
export default function TopBar() {
  const { t } = useTranslation();
  const { data } = useQuery(LIBRARIES);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const libraryMatch = useMatch('/library/:id');
  const currentId = libraryMatch ? readParam(libraryMatch.params.id) : null;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [location.pathname]);

  const libraries = (data?.libraries.nodes ?? []).filter((l) => !l.hidden);
  const movies = libraries.filter((l) => l.kind === 'MOVIE');
  const shows = libraries.filter((l) => l.kind === 'SHOW');

  return (
    <header className={styles.bar} data-scrolled={scrolled || undefined}>
      <nav className={styles.nav} aria-label={t('Main navigation')}>
        <Link to="/" className={styles.logo} aria-label={t('Home')}>
          <Logo />
        </Link>
        <SearchBox />
        <NavLink to="/" end className={styles.link}>
          <Icon name="home" size={18} className={styles.linkIcon} />
          <span className={styles.linkLabel}>{t('Home')}</span>
        </NavLink>
        <LibraryMenu label={t('Movies')} icon="movie" libraries={movies} currentId={currentId} />
        <LibraryMenu label={t('TV Shows')} icon="tv" libraries={shows} currentId={currentId} />
      </nav>
      <div className={styles.end}>
        <AccountMenu />
      </div>
    </header>
  );
}
