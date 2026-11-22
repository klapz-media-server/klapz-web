import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../../components/Button/Button';
import EmptyState from '../../components/EmptyState/EmptyState';
import Icon from '../../components/Icon/Icon';
import LibraryDeleteDialog from '../../components/LibraryDeleteDialog/LibraryDeleteDialog';
import LibraryEditor from '../../components/LibraryEditor/LibraryEditor';
import ScanButton from '../../components/ScanButton/ScanButton';
import styles from './ServerPage.module.css';

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

/** /servers/libraries — the server's libraries: adding, editing, scanning and deleting them. */
export default function LibrariesSection({ libraries }) {
  const { t } = useTranslation();
  // `null` for a new library, a library to edit, or `undefined` while the editor is closed.
  const [editedLibrary, setEditedLibrary] = useState(undefined);
  const [libraryToDelete, setLibraryToDelete] = useState(null);
  const [notice, setNotice] = useState(null);

  return (
    <div>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>{t('{{count}} library', { count: libraries.length })}</h2>
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
        <EmptyState
          variant="compact"
          icon="folder"
          title={t('No library yet')}
          description={t('A library lists the movies or shows of folders on the server. Users see the libraries you share with them.')}
          actions={
            <Button variant="accent" icon="plus" onClick={() => setEditedLibrary(null)}>
              {t('Add library')}
            </Button>
          }
        />
      ) : (
        <div className={styles.list}>
          {libraries.map((library) => (
            <LibraryRow key={library.id} library={library} onEdit={setEditedLibrary} onDelete={setLibraryToDelete} />
          ))}
        </div>
      )}

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
    </div>
  );
}
