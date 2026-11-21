import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { useTranslation } from 'react-i18next';
import Button from '../../components/Button/Button';
import Dialog from '../../components/Dialog/Dialog';
import ErrorMessage from '../../components/ErrorMessage/ErrorMessage';
import Icon from '../../components/Icon/Icon';
import LibraryDeleteDialog from '../../components/LibraryDeleteDialog/LibraryDeleteDialog';
import LibraryEditor from '../../components/LibraryEditor/LibraryEditor';
import NowPlaying from '../../components/NowPlaying/NowPlaying';
import ScanButton from '../../components/ScanButton/ScanButton';
import Spinner from '../../components/Spinner/Spinner';
import TextField from '../../components/TextField/TextField';
import UserCard from '../../components/UserCard/UserCard';
import { CREATE_USER, DELETE_USER } from '../../graphql/mutations';
import { ADMIN_USERS, VIEWER } from '../../graphql/queries';
import { FIELD_OF_ACCOUNT_ERROR, USERNAME_PATTERN, useAccountErrorText } from '../../hooks/useAccountErrorText';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useViewer } from '../../hooks/useViewer';
import styles from './AdminPage.module.css';

const refetch = { refetchQueries: [{ query: ADMIN_USERS }, { query: VIEWER }], awaitRefetchQueries: true };

/** One library in the owners' list: what it holds, where it is scanned from, and its actions. */
function LibraryRow({ library, onEdit, onDelete }) {
  const { t } = useTranslation();
  return (
    <div className={styles.library}>
      <span className={styles.libraryIcon}>
        <Icon name={library.kind === 'SHOW' ? 'tv' : library.kind === 'MOVIE' ? 'movie' : 'grid'} size={20} />
      </span>
      <div className={styles.libraryInfo}>
        <span className={styles.libraryTitle}>
          {library.title}
        </span>
        <span className={styles.libraryMeta}>
          {library.kind === 'SHOW' ? t('Shows') : library.kind === 'MOVIE' ? t('Movies') : library.kind} · {library.language}
        </span>
        {library.roots.length > 0 ? (
          <ul className={styles.libraryRoots}>
            {library.roots.map((root) => (
              <li key={root.id}>
                <Icon name="folder" size={13} />
                <span>{root.path}</span>
              </li>
            ))}
          </ul>
        ) : (
          <span className={styles.libraryMeta}>{t('No folder')}</span>
        )}
      </div>
      <div className={styles.libraryActions}>
        {(library.kind === 'MOVIE' || library.kind === 'SHOW') && <ScanButton libraryId={library.id} />}
        <Button size="sm" icon="edit" onClick={() => onEdit(library)}>
          {t('Edit')}
        </Button>
        <Button size="sm" variant="danger" icon="trash" aria-label={t('Delete {{title}}', { title: library.title })} onClick={() => onDelete(library)} />
      </div>
    </div>
  );
}

/**
 * Server administration: users, their role on the server and on each library, the libraries
 * themselves, and whether Plex apps may use the server on their behalf. For the server's owners.
 */
export default function AdminPage() {
  const { t } = useTranslation();
  usePageTitle(t('Administration'));
  const { user: me, owner } = useViewer();
  const { data, loading, error, refetch: reload } = useQuery(ADMIN_USERS, { skip: !owner });
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
  // `null` for a new library, a library to edit, or `undefined` while the editor is closed.
  const [editedLibrary, setEditedLibrary] = useState(undefined);
  const [libraryToDelete, setLibraryToDelete] = useState(null);
  const [notice, setNotice] = useState(null);

  if (!owner) {
    return (
      <div className={styles.page}>
        <ErrorMessage title={t('Reserved for the owners of the server')}>
          <p className={styles.denied}>{t('Ask an owner of the server to make you one.')}</p>
        </ErrorMessage>
      </div>
    );
  }
  if (loading && !data) return <Spinner fullPage />;
  if (error) {
    return (
      <div className={styles.page}>
        <ErrorMessage error={error} onRetry={() => reload()} />
      </div>
    );
  }

  // Those waiting for activation first: they are what an owner comes here for.
  const users = [...data.users.nodes].sort(
    (a, b) => Number(a.active) - Number(b.active) || a.username.localeCompare(b.username),
  );
  const waiting = users.filter((u) => !u.active).length;
  const libraries = data.libraries.nodes;
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

      <NowPlaying />

      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>{t('Libraries')}</h2>
        <Button size="sm" variant="accent" icon="plus" onClick={() => setEditedLibrary(null)}>
          {t('Add library')}
        </Button>
      </div>
      {notice && (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      )}
      {libraries.length === 0 ? (
        <p className={styles.empty}>{t('No library yet. Add one over a folder of the server.')}</p>
      ) : (
        <div className={styles.list}>
          {libraries.map((library) => (
            <LibraryRow key={library.id} library={library} onEdit={setEditedLibrary} onDelete={setLibraryToDelete} />
          ))}
        </div>
      )}

      <h2 className={[styles.sectionTitle, styles.spaced].join(' ')}>{t('Users')}</h2>
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

      {users.length === 0 ? (
        <p className={styles.empty}>{t('No users yet. Add one with a username.')}</p>
      ) : (
        <div className={styles.list}>
          {users.map((user) => (
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

      <LibraryEditor
        open={editedLibrary !== undefined}
        library={editedLibrary}
        onClose={() => setEditedLibrary(undefined)}
        onSaved={(saved, { scanned }) =>
          setNotice(scanned ? t('{{title}} saved. Its folders are being scanned.', { title: saved.title }) : t('{{title}} saved.', { title: saved.title }))
        }
      />

      <LibraryDeleteDialog
        library={libraryToDelete}
        onClose={() => setLibraryToDelete(null)}
        onDeleted={(deleted) => setNotice(t('{{title}} deleted.', { title: deleted.title }))}
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
