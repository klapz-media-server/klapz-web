import { Navigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import AccountSettings from '../../components/AccountSettings/AccountSettings';
import JellyfinSettings from '../../components/JellyfinSettings/JellyfinSettings';
import PlexSettings from '../../components/PlexSettings/PlexSettings';
import PreferencesSettings from '../../components/PreferencesSettings/PreferencesSettings';
import SidebarLayout from '../../components/SidebarLayout/SidebarLayout';
import Spinner from '../../components/Spinner/Spinner';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useViewer } from '../../hooks/useViewer';

const SECTIONS = [
  { id: 'account', icon: 'person', label: (t) => t('Account'), Component: AccountSettings },
  { id: 'preferences', icon: 'settings', label: (t) => t('Preferences'), Component: PreferencesSettings },
  { id: 'plex', icon: 'server', label: (t) => t('Plex'), Component: PlexSettings },
  { id: 'jellyfin', icon: 'tv', label: (t) => t('Jellyfin'), Component: JellyfinSettings },
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
    <SidebarLayout
      title={t('Settings')}
      items={SECTIONS.map((s) => ({ to: `/settings/${s.id}`, icon: s.icon, label: s.label(t) }))}
    >
      {session.loading ? <Spinner /> : <Component session={session} />}
    </SidebarLayout>
  );
}
