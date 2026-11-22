import { useState } from 'react';
import { artworkUrl, previewFor } from '../../utils/artwork';
import styles from './Backdrop.module.css';

/**
 * Page background for detail pages: a heavily blurred copy of the artwork
 * for the ambient color (Plex's "ultrablur") and the sharp artwork in the
 * top-right corner, faded into the page.
 */
export default function Backdrop({ item }) {
  const sharp = artworkUrl(item, 'background', 'background');
  // The preview's few colours are the ambient blur already, with nothing more to fetch, and
  // shown at once: the sharp image fades in over it.
  const preview = previewFor(item, 'background');
  const ambient = preview ?? artworkUrl(item, 'background', 'backgroundSmall');
  const [loaded, setLoaded] = useState(false);
  const [prev, setPrev] = useState(sharp);
  if (prev !== sharp) {
    setPrev(sharp);
    setLoaded(false);
  }

  return (
    <div className={styles.root} aria-hidden="true">
      {ambient && (
        <div
          className={styles.ambient}
          data-loaded={loaded || Boolean(preview) || undefined}
          style={{ backgroundImage: `url("${ambient}")` }}
        />
      )}
      <div className={styles.fallback} />
      {sharp && (
        <img
          key={sharp}
          className={styles.image}
          data-loaded={loaded || undefined}
          src={sharp}
          alt=""
          onLoad={() => setLoaded(true)}
        />
      )}
      <div className={styles.shade} />
    </div>
  );
}
