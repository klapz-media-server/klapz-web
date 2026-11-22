import { useEffect, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { useTranslation } from 'react-i18next';
import Button from '../../components/Button/Button';
import EmptyState from '../../components/EmptyState/EmptyState';
import Icon from '../../components/Icon/Icon';
import { LIBRARY_ROOTS } from '../../graphql/queries';
import { useLibraryScan } from '../../hooks/useLibraryScan';
import { libraryEmptyCase } from './libraryEmptyCase';
import styles from './LibraryPage.module.css';

/** How often an empty library being scanned asks again for what it holds, in milliseconds. */
const REFRESH_MS = 5000;

function RootList({ roots }) {
  const { t } = useTranslation();
  return (
    <ul className={styles.emptyRoots} aria-label={t('Folders of this library')}>
      {roots.map((root) => (
        <li key={root.id} data-unreachable={root.reachable === false || undefined}>
          <Icon name="folder" size={14} />
          <span className={styles.emptyRootPath}>{root.path}</span>
          {root.reachable === false && <span className={styles.emptyRootState}>{t('Unreachable')}</span>}
        </li>
      ))}
    </ul>
  );
}

function NamingHint({ kind }) {
  const { t } = useTranslation();
  return (
    <p className={styles.emptyHint}>
      {kind === 'SHOW'
        ? t('Klapz expects a folder per show, and a folder per season inside it, such as:')
        : t('Klapz expects a folder per movie, named with its title and year, such as:')}
      <code className={styles.emptyExample}>
        {kind === 'SHOW' ? 'Shows/Severance (2022)/Season 01/Severance - S01E01.mkv' : 'Movies/Inception (2010)/Inception (2010).mkv'}
      </code>
    </p>
  );
}

/**
 * What an empty library shows, telling apart filters that match nothing, a scan running, a folder
 * that cannot be reached and folders that hold nothing. Folders and the actions to fix them are
 * for those who may use them: scanning for the library's admins, the folders for the owners.
 * `onRefresh` asks again whether the library still is empty, which it does while a scan runs.
 */
export default function LibraryEmpty({ libraryId, kind, roots, filtered, onClearFilters, canEdit, owner, onEditFolders, onRefresh }) {
  const { t } = useTranslation();
  const scan = useLibraryScan(libraryId);
  const [refusal, setRefusal] = useState(null);
  // Looks at the disks: asked only for an empty library, and again on each visit.
  const live = useQuery(LIBRARY_ROOTS, { variables: { id: libraryId }, skip: filtered, fetchPolicy: 'network-only' });
  // A server that cannot tell whether a folder is reached answers with an error: the paths stay.
  const knownRoots = live.data?.node?.roots ?? roots ?? null;

  useEffect(() => {
    if (!scan.scanning || !onRefresh) return undefined;
    const timer = setInterval(onRefresh, REFRESH_MS);
    return () => clearInterval(timer);
  }, [scan.scanning, onRefresh]);

  const startScan = async () => {
    setRefusal(null);
    try {
      const code = await scan.start();
      if (code === 'UNSUPPORTED_KIND') setRefusal(t('This kind of library is not scanned.'));
      else if (code === 'LIBRARY_NOT_FOUND') setRefusal(t('This library no longer exists, or you may not change it.'));
    } catch (err) {
      setRefusal(err.message);
    }
  };

  const which = libraryEmptyCase({ filtered, scanning: scan.scanning, scannedAt: scan.scannedAt, roots: knownRoots });

  const scanAction = (label, variant) =>
    canEdit && (
      <Button key="scan" variant={variant} icon="replay" loading={scan.busy} onClick={startScan}>
        {label}
      </Button>
    );
  const editAction = (label, variant, icon = 'edit') =>
    owner && (
      <Button key="edit" variant={variant} icon={icon} onClick={onEditFolders}>
        {label}
      </Button>
    );

  let state;
  switch (which) {
    case 'noMatch':
      state = {
        icon: 'search',
        title: t('No items match these filters'),
        description: t('Try another genre, or show the watched items too.'),
        actions: [
          <Button key="clear" variant="primary" icon="close" onClick={onClearFilters}>
            {t('Clear filters')}
          </Button>,
        ],
      };
      break;
    case 'scanning':
      state = {
        busy: true,
        title: t('Scanning your folders…'),
        description: t('Items appear here as they are found. Large folders can take a while.'),
      };
      break;
    case 'noFolder':
      state = {
        icon: 'folder',
        title: t('This library has no folder'),
        description: canEdit
          ? owner
            ? t('Add a folder of the server for Klapz to scan.')
            : t('Ask an owner of the server to add a folder to it.')
          : t('Nothing has been added to this library yet.'),
        actions: [editAction(t('Add a folder'), 'accent', 'plus')],
      };
      break;
    case 'unreachable':
      state = {
        icon: 'folder',
        title: canEdit ? t("This folder can't be reached") : t("This library can't be reached right now"),
        description: canEdit
          ? t('The server cannot open it: a disk may be unplugged, or a network share down. Its items are kept until it is back.')
          : t('Its files are on a disk or a share that is not available. Try again later.'),
        details: canEdit && <RootList roots={knownRoots} />,
        actions: [scanAction(t('Try again'), 'primary'), editAction(t('Edit folders'), 'secondary')],
      };
      break;
    case 'neverScanned':
      state = {
        icon: 'replay',
        title: canEdit ? t('This library has not been scanned yet') : t('This library is empty'),
        description: canEdit ? t('Scan its folders to list what they hold.') : t('Nothing has been added to this library yet.'),
        details: canEdit && knownRoots?.length > 0 && <RootList roots={knownRoots} />,
        actions: [scanAction(t('Scan now'), 'accent'), editAction(t('Edit folders'), 'secondary')],
      };
      break;
    default:
      state = {
        icon: kind === 'SHOW' ? 'tv' : 'movie',
        title: canEdit ? t('No media found in these folders') : t('This library is empty'),
        description: canEdit ? t('The last scan found no video file it could recognize.') : t('Nothing has been added to this library yet.'),
        details: canEdit && (
          <>
            {knownRoots?.length > 0 && <RootList roots={knownRoots} />}
            <NamingHint kind={kind} />
          </>
        ),
        actions: [editAction(t('Edit folders'), 'primary'), scanAction(t('Scan again'), 'secondary')],
      };
  }

  const actions = state.actions?.filter(Boolean);
  return (
    <EmptyState
      live
      icon={state.icon}
      busy={state.busy}
      title={state.title}
      description={state.description}
      actions={actions?.length ? actions : null}
    >
      {state.details || null}
      {refusal && (
        <p className={styles.emptyRefusal} role="alert">
          {refusal}
        </p>
      )}
    </EmptyState>
  );
}
