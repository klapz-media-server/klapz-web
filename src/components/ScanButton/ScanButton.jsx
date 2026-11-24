import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLibraryScan } from '../../hooks/useLibraryScan';
import { analysisStage } from '../../utils/analysis';
import { formatDate } from '../../utils/format';
import Button from '../Button/Button';
import styles from './ScanButton.module.css';

/**
 * Scans a library for new, changed and removed files, or stops the scan running and the reading
 * of the files it found. For the library's admins and the server's owners; the server refuses
 * anyone else.
 */
export default function ScanButton({ libraryId, size = 'sm' }) {
  const { t } = useTranslation();
  const { scanning, scannedAt, failure: lastFailure, analysis, reading, busy, start, stop } = useLibraryScan(libraryId);
  const [failure, setFailure] = useState(null);
  const running = scanning || reading;
  const stage = analysisStage(analysis);

  const run = async () => {
    setFailure(null);
    try {
      const refusal = running ? (await stop(), null) : await start();
      if (refusal === 'UNSUPPORTED_KIND') setFailure(t('This kind of library is not scanned.'));
      else if (refusal === 'LIBRARY_NOT_FOUND') setFailure(t('This library no longer exists, or you may not change it.'));
    } catch (err) {
      setFailure(err.message);
    }
  };

  const last = scannedAt ? t('Last scanned on {{date}}', { date: formatDate(scannedAt) }) : t('Never scanned');
  let label = t('Scan files');
  if (scanning) label = t('Stop scanning');
  else if (reading) label = t('Stop reading files');
  let stopHint = last;
  if (scanning) stopHint = t('Stop the scan after the file it is on');
  else if (reading) stopHint = t('Stop reading this library’s files until its next scan');
  return (
    <span className={styles.scan}>
      <Button
        size={size}
        variant={running ? 'secondary' : 'ghost'}
        icon={running ? 'close' : 'replay'}
        loading={busy}
        title={stopHint}
        onClick={run}
      >
        {label}
      </Button>
      {scanning && (
        <span className={styles.badge} role="status">
          <span className={styles.dot} aria-hidden="true" />
          {t('Scanning…')}
        </span>
      )}
      {!scanning && reading && stage && (
        <span
          className={styles.badge}
          role="status"
          title={
            stage.round === 'headers'
              ? t('Tracks, codecs and durations are read first; files play without waiting for it.')
              : t('Each file is read to its end to measure its bitrates.')
          }
        >
          <span className={styles.dot} aria-hidden="true" />
          {stage.round === 'headers'
            ? t('Reading files… {{done}}/{{total}}', { done: stage.done, total: stage.total })
            : t('Measuring files… {{done}}/{{total}}', { done: stage.done, total: stage.total })}
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
      {!scanning && !failure && !lastFailure && analysis?.failure && (
        <span className={styles.failure} role="alert" title={analysis.failure}>
          {t('Files are not being read: {{reason}}', { reason: analysis.failure })}
        </span>
      )}
    </span>
  );
}
