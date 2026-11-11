import { useQuery } from '@apollo/client/react';
import { useInView } from '../../hooks/useInView';
import PosterCard from '../PosterCard/PosterCard';
import SkeletonRow from '../SkeletonRow/SkeletonRow';
import Slider from '../Slider/Slider';
import WideCard from '../WideCard/WideCard';
import styles from './MediaRow.module.css';

/**
 * A Slider bound to a query. The query only runs once the row approaches
 * the viewport, so long home pages stay cheap. Empty rows disappear.
 */
export default function MediaRow({ title, subtitle, to, query, variables, select, variant = 'poster', labelFor }) {
  const [ref, inView] = useInView({ rootMargin: '600px' });
  const { data, loading, error } = useQuery(query, { variables, skip: !inView });
  const items = data ? (select(data) ?? []) : [];

  if (inView && !loading && (error || items.length === 0)) return null;

  return (
    <div ref={ref} className={styles.row}>
      <Slider title={title} subtitle={subtitle} to={to} loading={!data}>
        {!data ? (
          <SkeletonRow variant={variant} />
        ) : (
          items.map((item) =>
            variant === 'wide' ? (
              <WideCard key={item.id} item={item} label={labelFor?.(item)} />
            ) : (
              <PosterCard key={item.id} item={item} />
            ),
          )
        )}
      </Slider>
    </div>
  );
}
