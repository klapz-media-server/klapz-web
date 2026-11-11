import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { useTranslation } from 'react-i18next';
import {
  ACTIVATE_USER,
  CONNECT_PLEX,
  DEACTIVATE_USER,
  DISABLE_PLEX,
  REMOVE_LIBRARY_PERMISSION,
  SET_LIBRARY_PERMISSION,
} from '../../graphql/mutations';
import { ADMIN_USERS } from '../../graphql/queries';
import { formatDate } from '../../utils/format';
import Button from '../Button/Button';
import Icon from '../Icon/Icon';
import SegmentedControl from '../SegmentedControl/SegmentedControl';
import styles from './UserCard.module.css';

const refetch = { refetchQueries: [{ query: ADMIN_USERS }], awaitRefetchQueries: true };

export function plexOf(user) {
  return user.extensions.nodes.find((e) => e.extension === 'PLEX') ?? null;
}

/**
 * One user in the administration: e-mail, access to each library
 * (none / viewer / admin), Plex access, deletion.
 */
export default function UserCard({ user, libraries, onDelete, onToken, onError, defaultOpen = false }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(defaultOpen);
  // A user just added opens once its id is known, which is after its card first renders.
  const [wasDefaultOpen, setWasDefaultOpen] = useState(defaultOpen);
  if (defaultOpen !== wasDefaultOpen) {
    setWasDefaultOpen(defaultOpen);
    if (defaultOpen) setOpen(true);
  }
  const [pending, setPending] = useState(() => new Set());
  const [setPermission] = useMutation(SET_LIBRARY_PERMISSION, refetch);
  const [removePermission] = useMutation(REMOVE_LIBRARY_PERMISSION, refetch);
  const [connectPlex, connecting] = useMutation(CONNECT_PLEX, refetch);
  const [disablePlex, disabling] = useMutation(DISABLE_PLEX, refetch);
  const [activate, activating] = useMutation(ACTIVATE_USER, refetch);
  const [deactivate, deactivating] = useMutation(DEACTIVATE_USER, refetch);
  const setActive = (active) =>
    (active ? activate : deactivate)({ variables: { id: user.id } }).catch(onError);

  const roles = new Map(
    user.libraryPermissions.nodes.filter((p) => p.library).map((p) => [p.library.id, p.role]),
  );
  const plex = plexOf(user);
  const plexEnabled = !!plex?.enabled;

  const roleOptions = [
    { value: null, label: t('No access') },
    { value: 'VIEWER', label: t('Viewer'), tone: 'success' },
    { value: 'ADMIN', label: t('Admin'), tone: 'accent' },
  ];

  const changeRole = async (libraryIds, role) => {
    setPending((p) => new Set([...p, ...libraryIds]));
    try {
      for (const libraryId of libraryIds) {
        if ((roles.get(libraryId) ?? null) === role) continue;
        if (role) await setPermission({ variables: { input: { userId: user.id, libraryId, role } } });
        else await removePermission({ variables: { userId: user.id, libraryId } });
      }
    } catch (e) {
      onError?.(e);
    } finally {
      setPending((p) => {
        const next = new Set(p);
        libraryIds.forEach((id) => next.delete(id));
        return next;
      });
    }
  };

  const issueToken = async () => {
    try {
      const { data } = await connectPlex({ variables: { userId: user.id } });
      onToken?.(user, data.connectExtension);
    } catch (e) {
      onError?.(e);
    }
  };

  const groups = [
    { kind: 'MOVIE', label: t('Movies') },
    { kind: 'SHOW', label: t('TV Shows') },
    { kind: 'OTHER', label: t('Other libraries') },
  ]
    .map((g) => ({
      ...g,
      libraries: libraries.filter((l) => (g.kind === 'OTHER' ? !['MOVIE', 'SHOW'].includes(l.kind) : l.kind === g.kind)),
    }))
    .filter((g) => g.libraries.length);

  const allIds = libraries.map((l) => l.id);
  const initial = user.email.trim().charAt(0).toUpperCase();

  return (
    <article className={styles.card} data-open={open || undefined} data-inactive={!user.active || undefined}>
      <header className={styles.head}>
        <span className={styles.avatar} aria-hidden="true">
          {initial}
        </span>
        <div className={styles.who}>
          <strong className={styles.email}>{user.email}</strong>
          <span className={styles.meta}>
            {t('Added {{date}}', { date: formatDate(new Date(user.createdAt * 1000).toISOString()) })}
            {' · '}
            {t('{{count}} of {{total}} libraries', { count: roles.size, total: libraries.length })}
          </span>
        </div>
        {!user.active && (
          <>
            <span className={styles.pending}>{user.hasPassword ? t('Awaiting activation') : t('Deactivated')}</span>
            <Button size="sm" variant="accent" icon="check" loading={activating.loading} onClick={() => setActive(true)}>
              {t('Activate')}
            </Button>
          </>
        )}
        <span className={styles.plexChip} data-on={plexEnabled || undefined}>
          <span className={styles.dot} />
          {plexEnabled ? (plex.account ? t('Plex · paired') : t('Plex · enabled')) : t('Plex · off')}
        </span>
        <button
          type="button"
          className={styles.expand}
          aria-expanded={open}
          aria-label={open ? t('Collapse') : t('Manage access')}
          onClick={() => setOpen((o) => !o)}
        >
          <Icon name="chevronDown" size={20} />
        </button>
      </header>

      {open && (
        <div className={styles.body}>
          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <h3 className={styles.sectionTitle}>{t('Libraries')}</h3>
              <div className={styles.bulk}>
                <Button size="sm" variant="ghost" onClick={() => changeRole(allIds, 'VIEWER')} disabled={pending.size > 0}>
                  {t('Allow all')}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => changeRole(allIds, null)} disabled={pending.size > 0}>
                  {t('Remove all')}
                </Button>
              </div>
            </div>
            {groups.map((group) => (
              <div key={group.kind} className={styles.group}>
                <h4 className={styles.groupTitle}>{group.label}</h4>
                <ul className={styles.libraries}>
                  {group.libraries.map((library) => (
                    <li key={library.id} className={styles.library} data-pending={pending.has(library.id) || undefined}>
                      <span className={styles.libraryName}>
                        <Icon name={library.kind === 'SHOW' ? 'tv' : 'movie'} size={16} />
                        {library.title}
                      </span>
                      <SegmentedControl
                        size="sm"
                        label={t('Access to {{library}}', { library: library.title })}
                        options={roleOptions}
                        value={roles.get(library.id) ?? null}
                        disabled={pending.has(library.id)}
                        onChange={(role) => changeRole([library.id], role)}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>{t('Account')}</h3>
            <p className={styles.note}>
              {user.active
                ? t('Active: the user can sign in and use what it was given.')
                : t('Inactive: nothing the user presents opens anything — its password, its sessions and its Plex token.')}{' '}
              {user.hasPassword ? t('Signs in with a password.') : t('No password: created by the administrator.')}
            </p>
            <div className={styles.row}>
              {user.active ? (
                <Button size="sm" variant="danger" loading={deactivating.loading} onClick={() => setActive(false)}>
                  {t('Deactivate the account')}
                </Button>
              ) : (
                <Button size="sm" variant="accent" icon="check" loading={activating.loading} onClick={() => setActive(true)}>
                  {t('Activate the account')}
                </Button>
              )}
            </div>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>{t('Plex access')}</h3>
            <p className={styles.note}>
              {plexEnabled
                ? plex.account
                  ? t('Paired with the Plex account {{account}}, reachable at {{address}}.', {
                      account: plex.account.accountName,
                      address: plex.account.connectionUri,
                    })
                  : t('Enabled. The user pairs their Plex account from their own settings.')
                : t('Off: Plex apps cannot use this server on behalf of this user.')}
            </p>
            <div className={styles.row}>
              {plexEnabled ? (
                <>
                  <Button size="sm" icon="share" onClick={issueToken} loading={connecting.loading}>
                    {t('New token')}
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    loading={disabling.loading}
                    onClick={() => disablePlex({ variables: { userId: user.id } }).catch(onError)}
                  >
                    {t('Disable Plex')}
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="accent" onClick={issueToken} loading={connecting.loading}>
                  {t('Enable Plex')}
                </Button>
              )}
              <span className={styles.spacer} />
              <Button size="sm" variant="danger" icon="close" onClick={() => onDelete(user)}>
                {t('Delete user')}
              </Button>
            </div>
          </section>
        </div>
      )}
    </article>
  );
}
