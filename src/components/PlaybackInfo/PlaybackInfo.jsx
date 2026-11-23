import { useTranslation } from 'react-i18next';
import { locale } from '../../i18n';
import { channelsLabel, formatBitrate, resolutionLabel } from '../../utils/format';
import { playbackMode } from '../../utils/playback';
import { formatSpeed } from '../StreamBadge/StreamBadge';
import styles from './PlaybackInfo.module.css';

const codecName = (codecs) => codecs?.split('.')[0]?.toUpperCase() ?? null;
const kbps = (bps) => (bps ? formatBitrate(Math.round(bps / 1000)) : null);
const join = (...parts) => parts.filter(Boolean).join(' · ') || '—';
const SUBTITLE_CODECS = { subrip: 'SRT', hdmv_pgs_subtitle: 'PGS', dvd_subtitle: 'VOBSUB', dvb_subtitle: 'DVB', mov_text: 'TX3G' };
const subtitleCodecName = (codec) => (codec ? (SUBTITLE_CODECS[codec] ?? codec.toUpperCase()) : null);

function Status({ converted, label }) {
  return (
    <span className={styles.status} data-converted={converted || undefined}>
      {label}
    </span>
  );
}

/**
 * "Info" tab of the player settings: what the server does with each stream,
 * subtitles included (source → delivered, copied or converted), transcoder speed, and live
 * playback stats from Shaka.
 */
export default function PlaybackInfo({ decision, source, live }) {
  const { t } = useTranslation();
  const mode = playbackMode(decision);
  const variant = live?.variant;
  const stats = live?.stats;

  const explanations = {
    DIRECT_PLAY: t('The file is sent as is: nothing is converted.'),
    TRANSCODE: t('The server converts the video while you watch.'),
  };
  const status = (value) =>
    value === 'TRANSCODE' || value === 'REMUX' ? (
      <Status converted label={t('Converted')} />
    ) : (
      <Status label={t('Copied')} />
    );

  const subtitle = decision?.subtitle;
  const rows = [
    {
      key: 'video',
      label: t('Video'),
      from: join(source?.videoCodec?.toUpperCase(), resolutionLabel(source?.width, source?.height)),
      to: join(codecName(variant?.videoCodec), variant?.height ? `${variant.width}×${variant.height}` : null),
      status: status(decision?.video),
    },
    {
      key: 'audio',
      label: t('Audio'),
      from: join(source?.audioCodec?.toUpperCase(), channelsLabel(source?.audioChannels)),
      to: join(codecName(variant?.audioCodec), channelsLabel(variant?.channelsCount)),
      status: status(decision?.audio),
    },
    subtitle && {
      key: 'subtitle',
      label: t('Subtitles'),
      from: subtitleCodecName(subtitle.codec) ?? '—',
      // No format: drawn into the picture rather than sent beside it.
      to: subtitle.format ?? t('In the picture'),
      status: status(subtitle.decision),
    },
    {
      key: 'container',
      label: t('Container'),
      from: source?.container?.toUpperCase() ?? '—',
      to:
        decision?.protocol ??
        (decision?.container === 'COPY' ? (source?.container?.toUpperCase() ?? '—') : 'DASH'),
      status: status(decision?.container),
    },
  ].filter(Boolean);

  const converting = decision?.video === 'TRANSCODE' || decision?.audio === 'TRANSCODE';
  const speed = decision?.speed;

  return (
    <div className={styles.info}>
      {explanations[mode] && (
        <div className={styles.mode}>
          <p className={styles.explain}>{explanations[mode]}</p>
        </div>
      )}

      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col" />
            <th scope="col">{t('Source')}</th>
            <th scope="col" aria-hidden="true" />
            <th scope="col">{t('Delivered')}</th>
            <th scope="col" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <th scope="row">{row.label}</th>
              <td>{row.from}</td>
              <td className={styles.arrow} aria-hidden="true">
                →
              </td>
              <td>{row.to}</td>
              <td>{row.status}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {converting && (
        <div className={styles.speedRow}>
          <span className={styles.speedLabel}>{t('Transcoder speed')}</span>
          {speed != null ? (
            <>
              <span className={styles.speedValue} data-slow={speed < 1 || undefined}>
                {formatSpeed(speed)}
              </span>
              <span className={styles.speedMeter} aria-hidden="true">
                <span style={{ width: `${Math.min(100, (speed / 4) * 100)}%` }} data-slow={speed < 1 || undefined} />
                <i style={{ left: '25%' }} />
              </span>
              <span className={styles.speedHint}>{speed < 1 ? t('Slower than real time') : t('Faster than real time')}</span>
            </>
          ) : (
            <span className={styles.speedHint}>{t('Not reported by the server')}</span>
          )}
        </div>
      )}

      <dl className={styles.stats}>
        <div>
          <dt>{t('Stream bitrate')}</dt>
          <dd>{kbps(stats?.streamBandwidth) ?? '—'}</dd>
        </div>
        <div>
          <dt>{t('Estimated bandwidth')}</dt>
          <dd>{kbps(stats?.estimatedBandwidth) ?? '—'}</dd>
        </div>
        <div>
          <dt>{t('Server wait per segment')}</dt>
          <dd>
            {live?.production?.averageMs != null
              ? `${new Intl.NumberFormat(locale(), { maximumFractionDigits: 2 }).format(live.production.averageMs / 1000)} s`
              : '—'}
          </dd>
        </div>
        <div>
          <dt>{t('Buffer')}</dt>
          <dd>{live?.bufferAhead != null ? `${new Intl.NumberFormat(locale(), { maximumFractionDigits: 1 }).format(live.bufferAhead)} s` : '—'}</dd>
        </div>
        <div>
          <dt>{t('Dropped frames')}</dt>
          <dd>
            {stats ? `${stats.droppedFrames ?? 0} / ${stats.decodedFrames ?? 0}` : '—'}
          </dd>
        </div>
      </dl>
    </div>
  );
}
