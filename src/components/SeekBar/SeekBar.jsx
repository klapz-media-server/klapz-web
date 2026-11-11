import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatClock } from '../../utils/format';
import styles from './SeekBar.module.css';

const clamp = (v) => Math.max(0, Math.min(1, v));

/**
 * Progress bar: played / buffered ranges, a time tooltip under the pointer,
 * drag to scrub (the video only seeks on release), arrow keys for ±5 s.
 */
export default function SeekBar({ currentTime, duration, buffered, onSeek, onScrubChange }) {
  const { t } = useTranslation();
  const trackRef = useRef(null);
  const [hover, setHover] = useState(null); // ratio under the pointer
  const [scrub, setScrub] = useState(null); // ratio while dragging

  const ratioAt = (clientX) => {
    const rect = trackRef.current.getBoundingClientRect();
    return clamp((clientX - rect.left) / rect.width);
  };

  const onPointerDown = (e) => {
    if (!duration) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const r = ratioAt(e.clientX);
    setScrub(r);
    onScrubChange?.(true);
  };
  const onPointerMove = (e) => {
    const r = ratioAt(e.clientX);
    setHover(r);
    if (scrub !== null) setScrub(r);
  };
  const onPointerUp = (e) => {
    if (scrub === null) return;
    const r = ratioAt(e.clientX);
    setScrub(null);
    onScrubChange?.(false);
    onSeek(r * duration);
  };
  const onKeyDown = (e) => {
    const steps = { ArrowLeft: -5, ArrowRight: 5, PageDown: -60, PageUp: 60 };
    if (e.key in steps) {
      e.preventDefault();
      e.stopPropagation();
      onSeek(currentTime + steps[e.key]);
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      e.stopPropagation();
      onSeek(e.key === 'Home' ? 0 : duration);
    }
  };

  const played = scrub ?? (duration ? currentTime / duration : 0);
  const bufferedRatio = duration ? clamp(buffered / duration) : 0;
  const tipRatio = scrub ?? hover;

  return (
    <div
      ref={trackRef}
      className={styles.seek}
      data-scrubbing={scrub !== null || undefined}
      role="slider"
      tabIndex={0}
      aria-label={t('Seek')}
      aria-valuemin={0}
      aria-valuemax={Math.round(duration)}
      aria-valuenow={Math.round(currentTime)}
      aria-valuetext={t('{{current}} of {{total}}', {
        current: formatClock(currentTime),
        total: formatClock(duration),
      })}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        setScrub(null);
        onScrubChange?.(false);
      }}
      onPointerLeave={() => setHover(null)}
      onKeyDown={onKeyDown}
    >
      <div className={styles.rail}>
        <div className={styles.buffered} style={{ transform: `scaleX(${bufferedRatio})` }} />
        {hover !== null && scrub === null && (
          <div className={styles.hoverFill} style={{ transform: `scaleX(${hover})` }} />
        )}
        <div className={styles.played} style={{ transform: `scaleX(${played})` }} />
      </div>
      <div className={styles.thumb} style={{ left: `${played * 100}%` }} />
      {tipRatio !== null && duration > 0 && (
        <div className={styles.tooltip} style={{ left: `clamp(28px, ${tipRatio * 100}%, calc(100% - 28px))` }}>
          {formatClock(tipRatio * duration)}
        </div>
      )}
    </div>
  );
}
