import { useTranslation } from 'react-i18next';
import { locale } from '../../i18n';
import { playbackMode } from '../../utils/playback';
import styles from './StreamBadge.module.css';

export function useModeLabel() {
  const { t } = useTranslation();
  return (mode) =>
    ({
      DIRECT_PLAY: t('Direct Play'),
      DIRECT_STREAM: t('Direct Stream'),
      TRANSCODE: t('Transcode'),
    })[mode];
}

export function formatSpeed(speed) {
  return `${new Intl.NumberFormat(locale(), { maximumFractionDigits: 1 }).format(speed)}×`;
}

/**
 * Pill telling how the server delivers the stream: Direct Play (green),
 * Direct Stream (blue), Transcode (orange, red when slower than real time),
 * with the transcoder speed when known.
 */
export default function StreamBadge({ decision, onClick, size = 'md', ...props }) {
  const { t } = useTranslation();
  const label = useModeLabel();
  const mode = playbackMode(decision);
  if (!mode) return null;
  const converting = decision.video === 'TRANSCODE' || decision.audio === 'TRANSCODE';
  const showSpeed = converting && decision.speed != null;
  const slow = showSpeed && decision.speed < 1;
  const tone = slow ? 'slow' : mode;
  const Component = onClick ? 'button' : 'span';

  return (
    <Component
      {...props}
      {...(onClick ? { type: 'button', onClick } : {})}
      className={styles.badge}
      data-tone={tone}
      data-size={size}
      title={slow ? t('The server transcodes slower than real time: playback may stall.') : t('Playback details')}
    >
      <span className={styles.dot} aria-hidden="true" />
      <span>{label(mode)}</span>
      {showSpeed && <span className={styles.speed}>{formatSpeed(decision.speed)}</span>}
    </Component>
  );
}
