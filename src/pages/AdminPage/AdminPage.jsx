import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { useTranslation } from 'react-i18next';
import Button from '../../components/Button/Button';
import Dialog from '../../components/Dialog/Dialog';
import ErrorMessage from '../../components/ErrorMessage/ErrorMessage';
import Icon from '../../components/Icon/Icon';
import Spinner from '../../components/Spinner/Spinner';
import TextField from '../../components/TextField/TextField';
import UserCard from '../../components/UserCard/UserCard';
import { CREATE_USER, DELETE_USER } from '../../graphql/mutations';
import { ADMIN_USERS } from '../../graphql/queries';
import { usePageTitle } from '../../hooks/usePageTitle';
import styles from './AdminPage.module.css';

const refetch = { refetchQueries: [{ query: ADMIN_USERS }], awaitRefetchQueries: true };

/** "not found" is what the API answers to anyone but the operator. */
export const isDenied = (error) => /not found/i.test(error?.message ?? '');

/**
 * Server administration: users, their access to each library, and whether
 * Plex apps may use the server on their behalf. Operator only.
 */
export default function AdminPage() {
  const { t } = useTranslation();
  usePageTitle(t('Administration'));
  const { data, loading, error, refetch: reload } = useQuery(ADMIN_USERS);
  const [createUser, creating] = useMutation(CREATE_USER, refetch);
  const [deleteUser, deleting] = useMutation(DELETE_USER, refetch);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState(null);
  const [newUserId, setNewUserId] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [credentials, setCredentials] = useState(null);
  const [copied, setCopied] = useState(false);

  if (loading && !data) return <Spinner fullPage />;
  if (error) {
    return isDenied(error) ? (
      <div className={styles.page}>
        <ErrorMessage title={t('Reserved for the server operator')}>
          <p className={styles.denied}>{t('Open this page from a trusted network, or with the operator token.')}</p>
        </ErrorMessage>
      </div>
    ) : (
      <div className={styles.page}>
        <ErrorMessage error={error} onRetry={() => reload()} />
      </div>
    );
  }

  // Those waiting for activation first: they are what the operator comes here for.
  const users = [...data.users.nodes].sort((a, b) => Number(a.active) - Number(b.active));
  const waiting = users.filter((u) => !u.active).length;
  const libraries = data.libraries.nodes;
  const fail = (e) => setMessage(isDenied(e) ? t('Not found, or not allowed.') : e.message);

  const add = async (e) => {
    e.preventDefault();
    setMessage(null);
    const value = email.trim();
    if (!value) return;
    try {
      const { data: created } = await createUser({ variables: { email: value } });
      setEmail('');
      setNewUserId(created.createUser.id);
    } catch (err) {
      fail(err);
    }
  };

  const confirmDelete = async () => {
    try {
      await deleteUser({ variables: { id: toDelete.id } });
      setToDelete(null);
    } catch (err) {
      setToDelete(null);
      fail(err);
    }
  };

  const copyToken = async () => {
    try {
      await navigator.clipboard.writeText(credentials.token);
      setCopied(true);
    } catch {
      /* the field stays selectable */
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.headerIcon}>
          <Icon name="server" size={22} />
        </span>
        <div>
          <h1 className={styles.title}>{t('Administration')}</h1>
          <p className={styles.subtitle}>
            {t('{{count}} user', { count: users.length })} · {t('{{count}} library', { count: libraries.length })}
            {waiting > 0 && (
              <>
                {' · '}
                <span className={styles.waiting}>{t('{{count}} awaiting activation', { count: waiting })}</span>
              </>
            )}
          </p>
        </div>
      </header>

      <form className={styles.add} onSubmit={add}>
        <TextField
          className={styles.addField}
          type="email"
          required
          placeholder="name@example.org"
          aria-label={t('E-mail address of the new user')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button type="submit" variant="accent" icon="person" loading={creating.loading}>
          {t('Add user')}
        </Button>
      </form>

      {message && (
        <p className={styles.message} role="alert">
          {message}
        </p>
      )}

      {users.length === 0 ? (
        <p className={styles.empty}>{t('No users yet. Add one with their e-mail address.')}</p>
      ) : (
        <div className={styles.list}>
          {users.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              libraries={libraries}
              defaultOpen={user.id === newUserId}
              onDelete={setToDelete}
              onError={fail}
              onToken={(u, connected) => {
                setCopied(false);
                setCredentials({ email: u.email, token: connected.token, server: connected.userExtension.externalId });
              }}
            />
          ))}
        </div>
      )}

      <Dialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title={t('Delete {{email}}?', { email: toDelete?.email })}
        description={t('Their library access and Plex connection are removed too. This cannot be undone.')}
        actions={
          <>
            <Button variant="ghost" onClick={() => setToDelete(null)}>
              {t('Cancel')}
            </Button>
            <Button variant="danger" onClick={confirmDelete} loading={deleting.loading}>
              {t('Delete')}
            </Button>
          </>
        }
      />

      <Dialog
        open={!!credentials}
        onClose={() => setCredentials(null)}
        title={t('Plex token for {{email}}', { email: credentials?.email })}
        description={t('Copy it now: it is shown only once, and the server only keeps a digest of it.')}
        actions={
          <Button variant="primary" onClick={() => setCredentials(null)}>
            {t('Done')}
          </Button>
        }
      >
        <div className={styles.credentials}>
          <div className={styles.copyRow}>
            <TextField
              className={styles.addField}
              label={t('Token')}
              readOnly
              value={credentials?.token ?? ''}
              onFocus={(e) => e.target.select()}
            />
            <Button icon={copied ? 'check' : 'share'} onClick={copyToken}>
              {copied ? t('Copied') : t('Copy')}
            </Button>
          </div>
          <TextField label={t('Server identifier')} readOnly value={credentials?.server ?? ''} onFocus={(e) => e.target.select()} />
        </div>
      </Dialog>
    </div>
  );
}
