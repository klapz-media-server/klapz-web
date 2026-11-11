import { useState } from 'react';
import { artworkUrl } from '../../utils/artwork';
import styles from './TitleLogo.module.css';

/** The title's clear logo when one exists, otherwise the title as text. */
export default function TitleLogo({ guid, title }) {
  const src = artworkUrl(guid, 'logo');
  const [state, setState] = useState(src ? 'loading' : 'error');
  const [prev, setPrev] = useState(src);
  if (prev !== src) {
    setPrev(src);
    setState(src ? 'loading' : 'error');
  }

  return (
    <h1 className={styles.root} data-state={state}>
      {src && state !== 'error' && (
        <img
          className={styles.logo}
          src={src}
          alt={title}
          onLoad={() => setState('loaded')}
          onError={() => setState('error')}
        />
      )}
      <span className={styles.text}>{title}</span>
    </h1>
  );
}
