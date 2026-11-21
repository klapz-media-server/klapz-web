import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { useTranslation } from 'react-i18next';
import { DELETE_LIBRARY } from '../../graphql/mutations';
import Button from '../Button/Button';
import Dialog from '../Dialog/Dialog';
import { LIBRARY_LISTS } from '../LibraryEditor/LibraryEditor';
import styles from './LibraryDeleteDialog.module.css';

/**
 * Asks an owner to confirm deleting `library`, then deletes it. The library leaves the cache,
 * so no page goes on showing it; `onDeleted` follows a deletion the server accepted.
 */
export default function LibraryDeleteDialog({ library, onClose, onDeleted }) {
  const { t } = useTranslation();
  const [failure, setFailure] = useState(null);
  const [remove, { loading }] = useMutation(DELETE_LIBRARY, {
    refetchQueries: LIBRARY_LISTS,
    update(cache, { data }) {
      const id = data?.deleteLibrary?.deletedLibraryId;
      if (!id) return;
      cache.evict({ id: cache.identify({ __typename: 'Library', id }) });
      cache.gc();
    },
  });

  const close = () => {
    setFailure(null);
    onClose();
  };

  const confirm = async () => {
    setFailure(null);
    try {
      const { data } = await remove({ variables: { input: { id: library.id } } });
      const refusal = data?.deleteLibrary?.userErrors?.[0];
      if (refusal) {
        setFailure(
          refusal.code === 'SCANNING'
            ? t('The library is being scanned. Try again once the scan is over.')
            : t('This library no longer exists, or you may not change it.'),
        );
        return;
      }
      close();
      onDeleted?.(library);
    } catch (err) {
      setFailure(/not found/i.test(err.message) ? t('Only an owner of the server deletes a library.') : err.message);
    }
  };

  return (
    <Dialog
      open={!!library}
      onClose={() => !loading && close()}
      title={t('Delete {{title}}?', { title: library?.title })}
      description={t(
        'Its items, collections and access rights are removed, and its playbacks stop. The files on disk stay where they are. This cannot be undone.',
      )}
      actions={
        <>
          <Button variant="ghost" onClick={close} disabled={loading}>
            {t('Cancel')}
          </Button>
          <Button variant="danger" icon="trash" onClick={confirm} loading={loading}>
            {t('Delete')}
          </Button>
        </>
      }
    >
      {failure && (
        <p className={styles.failure} role="alert">
          {failure}
        </p>
      )}
    </Dialog>
  );
}
