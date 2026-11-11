import { useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './ExpandableText.module.css';

/** A summary clamped to a few lines, with "Plus" / "Moins". */
export default function ExpandableText({ text, lines = 4, className }) {
  const { t } = useTranslation();
  const ref = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const check = () => setOverflowing(el.scrollHeight > el.clientHeight + 2);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text]);

  if (!text) return null;
  return (
    <div className={className}>
      <p
        ref={ref}
        className={styles.text}
        data-expanded={expanded || undefined}
        style={{ '--lines': lines }}
      >
        {text}
      </p>
      {(overflowing || expanded) && (
        <button type="button" className={styles.toggle} onClick={() => setExpanded((e) => !e)}>
          {expanded ? t('Less') : t('More')}
        </button>
      )}
    </div>
  );
}
