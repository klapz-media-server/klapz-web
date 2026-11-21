import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { useTranslation } from 'react-i18next';
import Button from '../../components/Button/Button';
import Dialog from '../../components/Dialog/Dialog';
import TextField from '../../components/TextField/TextField';
import UserCard from '../../components/UserCard/UserCard';
import { CREATE_USER, DELETE_USER } from '../../graphql/mutations';
import { ADMIN_USERS, VIEWER } from '../../graphql/queries';
import { FIELD_OF_ACCOUNT_ERROR, USERNAME_PATTERN, useAccountErrorText } from '../../hooks/useAccountErrorText';
import { useViewer } from '../../hooks/useViewer';
import styles from './ServerPage.module.css';

const refetch = { refetchQueries: [{ query: ADMIN_USERS }, { query: VIEWER }], awaitRefetchQueries: true };

/**
 * /servers/users — the server's users: adding and deleting them, their role on the server and
 * on each library, and whether Plex apps may use the server on their behalf.
 */
export default function UsersSection({ users, libraries }) {
  const { t } = useTranslation();
  const { user: me } = useViewer();
  const [createUser, creating] = useMutation(CREATE_USER, refetch);
  const [deleteUser, deleting] = useMutation(DELETE_USER, refetch);
  const errorText = useAccountErrorText();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState(null);
  const [message, setMessage] = useState(null);
  const [newUserId, setNewUserId] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [credentials, setCredentials] = useState(null);
  const [copied, setCopied] = useState(false);

  // Those waiting for activation first: they are what an owner comes here for.
  const sorted = [...users].sort(
    (a, b) => Number(a.active) - Number(b.active) || a.username.localeCompare(b.username),
  );
  /** A refusal: a payload's first `userErrors` entry, or a request that failed. */
  const fail = (e) => setMessage(e?.code ? errorText(e) : errorText({ code: 'NETWORK', message: e?.message }));

  const add = async (e) => {
    e.preventDefault();
    setMessage(null);
    setFieldError(null);
    const name = username.trim();
    if (!USERNAME_PATTERN.test(name)) {
      setFieldError({ field: 'username', text: errorText({ code: 'INVALID_USERNAME' }) });
      return;
    }
    try {
      const { data: answer } = await createUser({ variables: { input: { username: name, email: email.trim() || null } } });
      const refusal = answer.createUser.userErrors[0];
      if (refusal) {
        const field = FIELD_OF_ACCOUNT_ERROR[refusal.code] ?? refusal.field?.at(-1);
        if (field === 'username' || field === 'email') setFieldError({ field, text: errorText(refusal) });
        else fail(refusal);
        return;
      }
      setUsername('');
      setEmail('');
      setNewUserId(answer.createUser.user.id);
    } catch (err) {
      fail(err);
    }
  };

  const confirmDelete = async () => {
    try {
      const { data: answer } = await deleteUser({ variables: { input: { userId: toDelete.id } } });
      const refusal = answer.deleteUser.userErrors[0];
      if (refusal) fail(refusal);
    } catch (err) {
      fail(err);
    } finally {
      setToDelete(null);
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

  const waiting = users.filter((u) => !u.active).length;

  return (
    <div>
      <h2 className={styles.sectionTitle}>
        {t('{{count}} user', { count: users.length })}
        {waiting > 0 && (
          <>
            {' · '}
            <span className={styles.waiting}>{t('{{count}} awaiting activation', { count: waiting })}</span>
          </>
        )}
      </h2>
      <form className={styles.add} onSubmit={add} noValidate>
        <TextField
          className={styles.addField}
          required
          autoCapitalize="none"
          spellCheck={false}
          placeholder={t('username')}
          aria-label={t('Username of the new user')}
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            setFieldError(null);
          }}
          error={fieldError?.field === 'username' ? fieldError.text : null}
        />
        <TextField
          className={styles.addField}
          type="email"
          placeholder={t('name@example.org (optional)')}
          aria-label={t('E-mail address of the new user (optional)')}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setFieldError(null);
          }}
          error={fieldError?.field === 'email' ? fieldError.text : null}
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

      {sorted.length === 0 ? (
        <p className={styles.empty}>{t('No users yet. Add one with a username.')}</p>
      ) : (
        <div className={styles.list}>
          {sorted.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              self={user.id === me?.id}
              libraries={libraries}
              defaultOpen={user.id === newUserId}
              onDelete={setToDelete}
              onError={fail}
              onToken={(u, connected) => {
                setCopied(false);
                setCredentials({ username: u.username, token: connected.token, server: connected.userExtension.externalId });
              }}
            />
          ))}
        </div>
      )}

      <Dialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title={t('Delete {{username}}?', { username: toDelete?.username })}
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
        title={t('Plex token for {{username}}', { username: credentials?.username })}
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
