import { useState } from 'react';
import { artworkUrl, hueFromString } from '../../utils/artwork';
import Icon from '../Icon/Icon';
import styles from './Artwork.module.css';

/**
 * An image from the artwork endpoint, with a fade-in and a generated
 * placeholder when the item has no artwork.
 *
 * `ratio` is a CSS aspect-ratio (`2 / 3`, `16 / 9`…).
 */
export default function Artwork({
  guid,
  type = 'poster',
  size,
  title = '',
  ratio = '2 / 3',
  className,
  placeholderIcon = 'movie',
  eager = false,
}) {
  const src = artworkUrl(guid, type, size);
  const [state, setState] = useState(src ? 'loading' : 'error');
  const [prevSrc, setPrevSrc] = useState(src);
  if (src !== prevSrc) {
    setPrevSrc(src);
    setState(src ? 'loading' : 'error');
  }

  const hue = hueFromString(title || guid || '');

  return (
    <div
      className={[styles.frame, className].filter(Boolean).join(' ')}
      style={{ aspectRatio: ratio, '--hue': hue }}
    >
      {state !== 'loaded' && (
        <div className={styles.placeholder} data-state={state}>
          {state === 'error' && (
            <>
              <Icon name={placeholderIcon} size={28} className={styles.placeholderIcon} />
              {title && <span className={styles.placeholderTitle}>{title}</span>}
            </>
          )}
        </div>
      )}
      {src && state !== 'error' && (
        <img
          className={styles.image}
          data-loaded={state === 'loaded'}
          src={src}
          alt=""
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          draggable={false}
          onLoad={() => setState('loaded')}
          onError={() => setState('error')}
        />
      )}
    </div>
  );
}
