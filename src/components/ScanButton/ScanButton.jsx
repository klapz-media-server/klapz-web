import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLibraryScan } from '../../hooks/useLibraryScan';
import { formatDate } from '../../utils/format';
import Button from '../Button/Button';
import styles from './ScanButton.module.css';

/**
 * Scans a library for new, changed and removed files, or stops the scan running. For the
 * library's admins and the server's owners; the server refuses anyone else.
 */
export default function ScanButton({ libraryId, size = 'sm' }) {
  const { t } = useTranslation();
  const { scanning, scannedAt, failure: lastFailure, busy, start, stop } = useLibraryScan(libraryId);
  const [failure, setFailure] = useState(null);

  const run = async () => {
    setFailure(null);
    try {
      const refusal = scanning ? (await stop(), null) : await start();
      if (refusal === 'UNSUPPORTED_KIND') setFailure(t('This kind of library is not scanned.'));
      else if (refusal === 'LIBRARY_NOT_FOUND') setFailure(t('This library no longer exists, or you may not change it.'));
    } catch (err) {
      setFailure(err.message);
    }
  };

  const last = scannedAt ? t('Last scanned on {{date}}', { date: formatDate(scannedAt) }) : t('Never scanned');
  return (
    <span className={styles.scan}>
      <Button
        size={size}
        variant={scanning ? 'secondary' : 'ghost'}
        icon={scanning ? 'close' : 'replay'}
        loading={busy}
        title={scanning ? t('Stop the scan after the file it is on') : last}
        onClick={run}
      >
        {scanning ? t('Stop scanning') : t('Scan files')}
      </Button>
      {scanning && (
        <span className={styles.badge} role="status">
          <span className={styles.dot} aria-hidden="true" />
          {t('Scanning…')}
        </span>
      )}
      {failure && (
        <span className={styles.failure} role="alert">
          {failure}
        </span>
      )}
      {!scanning && !failure && lastFailure && (
        <span className={styles.failure} role="alert" title={lastFailure}>
          {t('The last scan stopped: {{reason}}', { reason: lastFailure })}
        </span>
      )}
    </span>
  );
}
