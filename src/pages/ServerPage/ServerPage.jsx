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
import UsersSection from './UsersSection';
import styles from './ServerPage.module.css';

// `data`: whether the section shows the users and libraries, which the page loads for all of them.
const SECTIONS = [
  { id: 'activity', icon: 'play', label: (t) => t('Activity'), Component: NowPlaying, data: false },
  { id: 'libraries', icon: 'folder', label: (t) => t('Libraries'), Component: LibrariesSection, data: true },
  { id: 'users', icon: 'person', label: (t) => t('Users'), Component: UsersSection, data: true },
];

/**
 * /servers/:section — server administration, for its owners: what is being played, the
 * libraries, and the users with their roles and Plex access.
 */
export default function ServerPage() {
  const { t } = useTranslation();
  const { section } = useParams();
  const { owner, loading: viewerLoading } = useViewer();
  const { data, loading, error, refetch } = useQuery(ADMIN_USERS, { skip: !owner });
  const current = SECTIONS.find((s) => s.id === section);
  usePageTitle(current ? `${current.label(t)} · ${t('Server settings')}` : t('Server settings'));

  if (!current) return <Navigate to="/servers/activity" replace />;
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
  if (!current.data) body = <Component />;
  else if (loading && !data) body = <Spinner />;
  else if (error) body = <ErrorMessage error={error} onRetry={() => refetch()} />;
  else body = <Component users={data.users.nodes} libraries={data.libraries.nodes} />;

  return (
    <SidebarLayout
      title={t('Server settings')}
      items={SECTIONS.map((s) => ({
        to: `/servers/${s.id}`,
        icon: s.icon,
        label: s.label(t),
        badge: s.id === 'users' ? waiting : 0,
      }))}
    >
      {body}
    </SidebarLayout>
  );
}
