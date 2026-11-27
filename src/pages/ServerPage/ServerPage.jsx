import { useQuery } from '@apollo/client/react';
import { Navigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import ErrorMessage from '../../components/ErrorMessage/ErrorMessage';
import NowPlaying from '../../components/NowPlaying/NowPlaying';
import SidebarLayout from '../../components/SidebarLayout/SidebarLayout';
import Spinner from '../../components/Spinner/Spinner';
import { ADMIN_USERS } from '../../graphql/queries';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useViewer } from '../../hooks/useViewer';
import LibrariesSection from './LibrariesSection';
import ServerSettingsSection from './ServerSettingsSection';
import UsersSection from './UsersSection';
import styles from './ServerPage.module.css';

// `data`: whether the section shows the users and libraries, which the page loads for all of them.
const SECTIONS = [
  { id: 'activity', icon: 'play', label: (t) => t('Activity'), Component: NowPlaying, data: false },
  { id: 'libraries', icon: 'folder', label: (t) => t('Libraries'), Component: LibrariesSection, data: true },
  { id: 'users', icon: 'person', label: (t) => t('Users'), Component: UsersSection, data: true },
];

// The sections of `/servers/settings/:sub`, one per namespace of the server's settings.
const SETTINGS = [
  {
    id: 'general',
    label: (t) => t('General'),
    intro: (t) => t('What concerns the server as a whole. Each change is saved at once.'),
  },
  {
    id: 'transcoder',
    label: (t) => t('Transcoder'),
    intro: (t) => t('How the server converts what a player cannot read as it is. Each change is saved at once and applies from the next playback.'),
  },
  {
    id: 'scanner',
    label: (t) => t('Scanner'),
    intro: (t) => t('How the server walks and reads the folders of its libraries. Each change is saved at once and applies from the next scan.'),
  },
];

/**
 * /servers/:section — server administration, for its owners: what is being played, the
 * libraries, the users with their roles and Plex access. /servers/settings/:sub — the server's
 * settings, one namespace per section.
 */
export default function ServerPage() {
  const { t } = useTranslation();
  const { section, sub } = useParams();
  const { owner, loading: viewerLoading } = useViewer();
  const { data, loading, error, refetch } = useQuery(ADMIN_USERS, { skip: !owner });
  const settings = section === 'settings' ? SETTINGS.find((s) => s.id === sub) : null;
  const current = settings ?? SECTIONS.find((s) => s.id === section);
  usePageTitle(current ? `${current.label(t)} · ${t('Server settings')}` : t('Server settings'));

  if (section === 'settings' && !settings) return <Navigate to="/servers/settings/general" replace />;
  if (!current) return <Navigate to="/servers/activity" replace />;
  if (!settings && sub) return <Navigate to={`/servers/${section}`} replace />;
  if (viewerLoading) return <Spinner fullPage />;
  if (!owner) {
    return (
      <div className={styles.page}>
        <ErrorMessage title={t('Reserved for the owners of the server')}>
          <p className={styles.denied}>{t('Ask an owner of the server to make you one.')}</p>
        </ErrorMessage>
      </div>
    );
  }

  // Those waiting for activation are what an owner comes for: the menu counts them.
  const waiting = data?.users.nodes.filter((u) => !u.active).length ?? 0;
  const { Component } = current;
  let body;
  if (settings) body = <ServerSettingsSection key={settings.id} namespace={settings.id} intro={settings.intro(t)} />;
  else if (!current.data) body = <Component />;
  else if (loading && !data) body = <Spinner />;
  else if (error) body = <ErrorMessage error={error} onRetry={() => refetch()} />;
  else body = <Component users={data.users.nodes} libraries={data.libraries.nodes} />;

  return (
    <SidebarLayout
      title={t('Server settings')}
      items={[
        ...SECTIONS.map((s) => ({
          to: `/servers/${s.id}`,
          icon: s.icon,
          label: s.label(t),
          badge: s.id === 'users' ? waiting : 0,
        })),
        {
          icon: 'settings',
          label: t('Settings'),
          children: SETTINGS.map((s) => ({ to: `/servers/settings/${s.id}`, label: s.label(t) })),
        },
      ]}
    >
      {body}
    </SidebarLayout>
  );
}
