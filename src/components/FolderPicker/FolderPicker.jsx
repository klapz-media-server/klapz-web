import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { useTranslation } from 'react-i18next';
import { SERVER_DIRECTORIES } from '../../graphql/queries';
import Button from '../Button/Button';
import Dialog from '../Dialog/Dialog';
import Icon from '../Icon/Icon';
import Spinner from '../Spinner/Spinner';
import { pathSegments } from './folderPath';
import styles from './FolderPicker.module.css';

const PAGE_SIZE = 200;

function useErrorText() {
  const { t } = useTranslation();
  return (code) =>
    ({
      NOT_FOUND: t('This folder no longer exists on the server.'),
      NOT_A_DIRECTORY: t('This path is not a folder of the server.'),
      UNREADABLE: t('The server is not allowed to read this folder.'),
    })[code] ?? t('The server could not list this folder.');
}

/** Arrow keys move between the folders of the list, as in a file manager. */
function moveFocus(e) {
  const step = { ArrowDown: 1, ArrowUp: -1 }[e.key];
  if (!step) return;
  const buttons = [...e.currentTarget.querySelectorAll('button')];
  const next = buttons[buttons.indexOf(document.activeElement) + step];
  if (next) {
    e.preventDefault();
    next.focus();
  }
}

function PickerDialog({ start, onPick, onClose }) {
  const { t } = useTranslation();
  const errorText = useErrorText();
  const listRef = useRef(null);
  const [path, setPath] = useState(start || null);
  const [startMissed, setStartMissed] = useState(false);
  const { data, loading, error, fetchMore } = useQuery(SERVER_DIRECTORIES, {
    variables: { path, first: PAGE_SIZE },
    fetchPolicy: 'network-only',
    notifyOnNetworkStatusChange: true,
  });
  const answer = data?.serverDirectories;
  const listing = answer?.listing;
  const directories = listing?.directories.nodes ?? [];
  const failure = answer?.error;
  const settled = !loading && !!answer;

  // A path typed by hand that leads nowhere is no reason to stop: browse from the top instead.
  useEffect(() => {
    if (settled && failure && path && path === start && !startMissed) {
      setStartMissed(true);
      setPath(null);
    }
  }, [settled, failure, path, start, startMissed]);

  // Entering a folder unmounts the button that had focus: hand it to the new first folder.
  useEffect(() => {
    if (!settled || listRef.current?.contains(document.activeElement)) return;
    if (document.activeElement === document.body || !document.activeElement?.isConnected) {
      listRef.current?.querySelector('button')?.focus();
    }
  }, [settled, path]);

  const up = listing?.parent ?? null;
  const showMore = () =>
    fetchMore({
      variables: { after: listing.directories.pageInfo.endCursor },
      updateQuery: (previous, { fetchMoreResult }) => {
        const more = fetchMoreResult?.serverDirectories?.listing?.directories;
        if (!more) return previous;
        const before = previous.serverDirectories.listing;
        return {
          serverDirectories: {
            ...previous.serverDirectories,
            listing: {
              ...before,
              directories: { ...more, nodes: [...before.directories.nodes, ...more.nodes] },
            },
          },
        };
      },
    });

  let body;
  if (loading && !listing) {
    body = (
      <div className={styles.state}>
        <Spinner />
      </div>
    );
  } else if (error || failure) {
    body = (
      <p className={styles.failure} role="alert">
        {failure ? errorText(failure) : error.message}
      </p>
    );
  } else if (directories.length === 0) {
    body = <p className={styles.state}>{t('No folder here.')}</p>;
  } else {
    body = (
      <>
        <ul ref={listRef} className={styles.list} aria-label={t('Folders')} onKeyDown={moveFocus}>
          {directories.map((directory) => (
            <li key={directory.path}>
              <button type="button" className={styles.entry} onClick={() => setPath(directory.path)}>
                <Icon name="folder" size={16} />
                <span>{directory.name}</span>
                <Icon name="chevronRight" size={14} />
              </button>
            </li>
          ))}
        </ul>
        {listing.directories.pageInfo.hasNextPage && (
          <Button size="sm" className={styles.more} onClick={showMore} loading={loading}>
            {t('Show more')}
          </Button>
        )}
        {listing.truncated && <p className={styles.hint}>{t('This folder holds too many folders to list them all: type the path of the one you want.')}</p>}
      </>
    );
  }

  return (
    <Dialog
      open
      onClose={onClose}
      size="wide"
      title={t('Choose a folder')}
      description={t('The folders of the server, as it sees them.')}
      actions={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('Cancel')}
          </Button>
          <Button variant="accent" icon="check" disabled={!listing?.path || loading} onClick={() => onPick(listing.path)}>
            {t('Select this folder')}
          </Button>
        </>
      }
    >
      {startMissed && !path && <p className={styles.hint}>{t('The server finds no folder at the path typed: browse from the top.')}</p>}
      <div className={styles.toolbar}>
        <Button
          variant="ghost"
          icon="arrowLeft"
          aria-label={t('Parent folder')}
          title={t('Parent folder')}
          disabled={!path}
          onClick={() => setPath(up)}
        />
        <nav className={styles.breadcrumb} aria-label={t('Current folder')}>
          <ol>
            <li>
              <button type="button" onClick={() => setPath(null)} aria-current={path ? undefined : 'location'}>
                <Icon name="server" size={14} />
                <span>{t('Server')}</span>
              </button>
            </li>
            {pathSegments(listing?.path ?? path).map((segment, index, all) => (
              <li key={segment.path}>
                <button type="button" onClick={() => setPath(segment.path)} aria-current={index === all.length - 1 ? 'location' : undefined}>
                  {segment.name}
                </button>
              </li>
            ))}
          </ol>
        </nav>
      </div>
      <div className={styles.body} aria-busy={loading || undefined}>
        {body}
      </div>
    </Dialog>
  );
}

/**
 * Browses the server's folders and picks one, for an owner choosing a library's. Starts at
 * `start` when the server finds a folder there, otherwise at its drives (or `/`).
 * `onPick(path)` receives the path as the server writes it; the picker then closes.
 */
export default function FolderPicker({ open, start, onClose, onPick }) {
  // Mounted only while open, so each opening starts afresh from `start`.
  if (!open) return null;
  return (
    <PickerDialog
      start={start?.trim() || null}
      onClose={onClose}
      onPick={(path) => {
        onPick(path);
        onClose();
      }}
    />
  );
}
