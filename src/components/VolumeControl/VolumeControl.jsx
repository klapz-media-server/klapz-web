import { useTranslation } from 'react-i18next';
import PlayerIconButton from '../PlayerIconButton/PlayerIconButton';
import styles from './VolumeControl.module.css';

/** Mute button with a slider that slides out on hover. */
export default function VolumeControl({ volume, muted, onVolume, onToggleMute }) {
  const { t } = useTranslation();
  const level = muted ? 0 : volume;
  const icon = level === 0 ? 'volumeOff' : level < 0.5 ? 'volumeLow' : 'volumeHigh';

  return (
    <div className={styles.volume}>
      <PlayerIconButton icon={icon} label={muted ? t('Unmute (m)') : t('Mute (m)')} onClick={onToggleMute} />
      <div className={styles.sliderWrap}>
        <input
          className={styles.slider}
          type="range"
          min={0}
          max={1}
          step={0.02}
          value={level}
          aria-label={t('Volume')}
          aria-valuetext={`${Math.round(level * 100)} %`}
          style={{ '--level': `${level * 100}%` }}
          onChange={(e) => onVolume(Number(e.target.value))}
          onKeyDown={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
}
