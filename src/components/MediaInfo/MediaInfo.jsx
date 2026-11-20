import {
  channelsLabel,
  formatBitrate,
  formatBytes,
  formatDuration,
  languageLabel,
  resolutionLabel,
} from '../../utils/format';
import { useTranslation } from 'react-i18next';
import styles from './MediaInfo.module.css';

function dynamicRange(stream) {
  const v = stream?.video;
  if (!v) return null;
  if (v.dolbyVision) return 'Dolby Vision';
  if (v.hasHdr10Plus) return 'HDR10+';
  const transfer = v.color?.transfer;
  if (transfer === 'smpte2084') return 'HDR10';
  if (transfer === 'arib-std-b67') return 'HLG';
  return null;
}

function unique(list) {
  return [...new Set(list.filter(Boolean))];
}

/** Technical details of every version, in a rounded panel. */
export default function MediaInfo({ versions, title }) {
  const { t } = useTranslation();
  if (!versions?.length) return null;
  return (
    <section className={styles.panel}>
      <h2 className={styles.title}>{title ?? t('Technical details')}</h2>
      <div className={styles.versions}>
        {versions.map((version, i) => {
          const files = version.files ?? [];
          const streams = files.flatMap((f) => f.streams ?? []);
          const videoStream = streams.find((s) => s.kind === 'VIDEO');
          const audio = streams.filter((s) => s.kind === 'AUDIO');
          const subtitles = streams.filter((s) => s.kind === 'SUBTITLE');
          const size = files.reduce((sum, f) => sum + Number(f.sizeBytes ?? 0), 0); // sizeBytes is a string (64-bit)
          const res = resolutionLabel(version.width, version.height);
          const hdr = dynamicRange(videoStream);

          const rows = [
            [t('Video'), [res, version.videoCodec?.toUpperCase(), hdr].filter(Boolean).join(' · ')],
            [
              t('Audio'),
              audio.length
                ? unique(
                    audio.map((a) =>
                      [languageLabel(a.language), a.codec?.toUpperCase(), channelsLabel(a.channels)]
                        .filter(Boolean)
                        .join(' '),
                    ),
                  ).join(', ')
                : [version.audioCodec?.toUpperCase(), channelsLabel(version.audioChannels)]
                    .filter(Boolean)
                    .join(' '),
            ],
            [
              t('Subtitles'),
              subtitles.length
                ? unique(subtitles.map((s) => languageLabel(s.language) + (s.isForced ? ` ${t('(forced)')}` : ''))).join(', ')
                : t('None'),
            ],
            [t('Duration'), formatDuration(version.durationMs)],
            [t('File'), [version.container?.toUpperCase(), formatBytes(size), formatBitrate(version.bitrate)].filter(Boolean).join(' · ')],
          ].filter(([, v]) => v);

          return (
            <div key={version.id} className={styles.version}>
              <div className={styles.versionHeader}>
                {res && <span className={styles.quality}>{res}</span>}
                <span className={styles.versionName}>
                  {versions.length > 1 ? t('Version {{number}}', { number: i + 1 }) : files[0]?.filename}
                </span>
              </div>
              <dl className={styles.rows}>
                {rows.map(([label, value]) => (
                  <div key={label} className={styles.row}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          );
        })}
      </div>
    </section>
  );
}
