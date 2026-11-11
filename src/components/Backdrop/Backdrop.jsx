import { useState } from 'react';
import { artworkUrl } from '../../utils/artwork';
import styles from './Backdrop.module.css';

/**
 * Page background for detail pages: a heavily blurred copy of the artwork
 * for the ambient color (Plex's "ultrablur") and the sharp artwork in the
 * top-right corner, faded into the page.
 */
export default function Backdrop({ guid }) {
  const sharp = artworkUrl(guid, 'background', 'background');
  const ambient = artworkUrl(guid, 'background', 'backgroundSmall');
  const [loaded, setLoaded] = useState(false);
  const [prev, setPrev] = useState(guid);
  if (prev !== guid) {
    setPrev(guid);
    setLoaded(false);
  }

  return (
    <div className={styles.root} aria-hidden="true">
      {ambient && (
        <div
          className={styles.ambient}
          data-loaded={loaded || undefined}
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
