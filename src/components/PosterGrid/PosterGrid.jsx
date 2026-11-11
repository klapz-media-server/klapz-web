import { useEffect } from 'react';
import { useInView } from '../../hooks/useInView';
import PosterCard from '../PosterCard/PosterCard';
import Spinner from '../Spinner/Spinner';
import styles from './PosterGrid.module.css';

/** Responsive poster grid with infinite scroll via `onLoadMore`. */
export default function PosterGrid({ items, hasMore, loadingMore, onLoadMore, skeletonCount = 0 }) {
  const [sentinelRef, inView] = useInView({ rootMargin: '800px', once: false });

  useEffect(() => {
    if (inView && hasMore && !loadingMore) onLoadMore?.();
  }, [inView, hasMore, loadingMore, onLoadMore]);

  return (
    <>
      <div className={styles.grid}>
        {items.map((item) => (
          <PosterCard key={item.id} item={item} fluid />
        ))}
        {Array.from({ length: skeletonCount }, (_, i) => (
          <div key={`s${i}`} className={styles.skeleton}>
            <div className={styles.skeletonPoster} />
            <div className={styles.skeletonLine} />
          </div>
        ))}
      </div>
      {hasMore && (
        <div ref={sentinelRef} className={styles.sentinel}>
          {loadingMore && <Spinner />}
        </div>
      )}
    </>
  );
}
