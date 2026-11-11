import { useState } from 'react';
import { Link } from 'react-router';
import { hueFromString } from '../../utils/artwork';
import styles from './PersonCard.module.css';

function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

/** Round portrait with name and role, as in the cast rows of Plex. */
export default function PersonCard({ name, role, thumbUrl, to }) {
  const [failed, setFailed] = useState(false);
  const showImage = thumbUrl && !failed;
  const content = (
    <>
      <span className={styles.avatar} style={{ '--hue': hueFromString(name) }}>
        {showImage ? (
          <img src={thumbUrl} alt="" loading="lazy" onError={() => setFailed(true)} />
        ) : (
          <span className={styles.initials}>{initials(name)}</span>
        )}
      </span>
      <span className={styles.name}>{name}</span>
      {role && <span className={styles.role}>{role}</span>}
    </>
  );
  return to ? (
    <Link to={to} className={styles.card} title={name}>
      {content}
    </Link>
  ) : (
    <div className={styles.card}>{content}</div>
  );
}
