import { useState } from 'react';
import { artworkUrl, hueFromString, previewFor } from '../../utils/artwork';
import Icon from '../Icon/Icon';
import styles from './Artwork.module.css';

/**
 * An item's image, with a fade-in over its blurred preview while it loads, and a generated
 * placeholder when the item has no artwork.
 *
 * `item` is the item, or a list of items tried in order (a season, then its series).
 * `ratio` is a CSS aspect-ratio (`2 / 3`, `16 / 9`…).
 */
export default function Artwork({
  item,
  type = 'poster',
  size,
  title = '',
  ratio = '2 / 3',
  className,
  placeholderIcon = 'movie',
  eager = false,
}) {
  const src = artworkUrl(item, type, size);
  const preview = previewFor(item, type);
  const [state, setState] = useState(src ? 'loading' : 'error');
  const [prevSrc, setPrevSrc] = useState(src);
  if (src !== prevSrc) {
    setPrevSrc(src);
    setState(src ? 'loading' : 'error');
  }

  const first = Array.isArray(item) ? item[0] : item;
  const hue = hueFromString(title || first?.guid || '');

  return (
    <div
      className={[styles.frame, className].filter(Boolean).join(' ')}
      style={{ aspectRatio: ratio, '--hue': hue }}
    >
      {/* A preview stays under the image, which fades in over it once loaded. */}
      {(state !== 'loaded' || preview) && (
        <div
          className={styles.placeholder}
          data-state={state}
          data-preview={(preview && state !== 'error') || undefined}
          style={preview && state !== 'error' ? { backgroundImage: `url("${preview}")` } : undefined}
        >
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
