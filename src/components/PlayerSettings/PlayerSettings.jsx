import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Icon from '../Icon/Icon';
import PlaybackInfo from '../PlaybackInfo/PlaybackInfo';
import styles from './PlayerSettings.module.css';

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

function Option({ option }) {
  return (
    <li>
      <button
        type="button"
        role="menuitemradio"
        aria-checked={!!option.selected}
        className={styles.option}
        onClick={option.onSelect}
        disabled={option.disabled}
      >
        <span className={styles.check}>{option.selected && <Icon name="check" size={18} />}</span>
        <span className={styles.optionLabel}>{option.label}</span>
        {option.detail && <span className={styles.optionDetail}>{option.detail}</span>}
      </button>
    </li>
  );
}

function OptionList({ options, empty }) {
  return (
    <ul className={styles.list} role="menu">
      {options.length === 0 && empty && <li className={styles.empty}>{empty}</li>}
      {options.map((option) => (
        <Option key={option.key} option={option} />
      ))}
    </ul>
  );
}

/**
 * Floating panel with tabs: audio & subtitles, quality, speed, and the
 * playback details. Options are `{ key, label, detail, selected, onSelect }`,
 * built by the player from the server's tracks or from Shaka's.
 */
export default function PlayerSettings({
  tab,
  onTab,
  onClose,
  audioOptions,
  textOptions,
  qualityOptions,
  rate,
  onRate,
  decision,
  source,
  live,
}) {
  const { t } = useTranslation();
  const ref = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    const onPointer = (e) => {
      if (!ref.current?.contains(e.target) && !e.target.closest?.('[data-settings-toggle]')) onClose();
    };
    window.addEventListener('keydown', onKey, true);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [onClose]);

  const tabs = [
    { id: 'tracks', label: t('Audio & subtitles') },
    { id: 'quality', label: t('Quality') },
    { id: 'speed', label: t('Speed') },
    { id: 'info', label: t('Info') },
  ];

  const speedOptions = SPEEDS.map((speed) => ({
    key: String(speed),
    label: speed === 1 ? t('Normal') : `${speed}×`,
    selected: rate === speed,
    onSelect: () => onRate(speed),
  }));

  return (
    <div ref={ref} className={styles.panel} role="dialog" aria-label={t('Playback settings')}>
      <div className={styles.tabs} role="tablist">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={styles.tab}
            onClick={() => onTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className={styles.body}>
        {tab === 'tracks' && (
          <div className={styles.columns}>
            <section>
              <h3 className={styles.heading}>{t('Audio')}</h3>
              <OptionList options={audioOptions} empty={t('Default track')} />
            </section>
            <section>
              <h3 className={styles.heading}>{t('Subtitles')}</h3>
              <OptionList options={textOptions} />
            </section>
          </div>
        )}
        {tab === 'quality' && <OptionList options={qualityOptions} />}
        {tab === 'speed' && <OptionList options={speedOptions} />}
        {tab === 'info' && <PlaybackInfo decision={decision} source={source} live={live} />}
      </div>
    </div>
  );
}
