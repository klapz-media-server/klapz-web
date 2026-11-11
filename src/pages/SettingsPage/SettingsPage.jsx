import { Link, NavLink, Navigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import AccountSettings from '../../components/AccountSettings/AccountSettings';
import Icon from '../../components/Icon/Icon';
import PlexSettings from '../../components/PlexSettings/PlexSettings';
import PreferencesSettings from '../../components/PreferencesSettings/PreferencesSettings';
import Spinner from '../../components/Spinner/Spinner';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useViewer } from '../../hooks/useViewer';
import styles from './SettingsPage.module.css';

const SECTIONS = [
  { id: 'account', icon: 'person', label: (t) => t('Account'), Component: AccountSettings },
  { id: 'plex', icon: 'server', label: (t) => t('Plex'), Component: PlexSettings },
  { id: 'preferences', icon: 'settings', label: (t) => t('Preferences'), Component: PreferencesSettings },
];

/** /settings/:section — the signed-in account's settings. */
export default function SettingsPage() {
  const { t } = useTranslation();
  const { section } = useParams();
  const session = useViewer();
  const current = SECTIONS.find((s) => s.id === section);
  usePageTitle(current ? `${current.label(t)} · ${t('Settings')}` : t('Settings'));

  if (!current) return <Navigate to="/settings/account" replace />;

  const { Component } = current;
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t('Settings')}</h1>
      <div className={styles.layout}>
        <nav className={styles.nav} aria-label={t('Settings')}>
          {SECTIONS.map((s) => (
            <NavLink key={s.id} to={`/settings/${s.id}`} className={styles.navLink} state={{ keepScroll: true }}>
              <Icon name={s.icon} size={18} />
              {s.label(t)}
            </NavLink>
          ))}
          {session.viewer?.isOperator && (
            <Link to="/admin" className={styles.navLink} data-secondary>
              <Icon name="grid" size={18} />
              {t('Administration')}
            </Link>
          )}
        </nav>
        <div className={styles.content}>
          {!session.supported && (
            <p className={styles.warning} role="status">
              {t('This server is too old to tell who is signed in: update open-plex to manage your account here.')}
            </p>
          )}
          {session.loading && !session.viewer && session.supported ? <Spinner /> : <Component session={session} />}
        </div>
      </div>
    </div>
  );
}
