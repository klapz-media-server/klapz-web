import { useNavigate, useSearchParams } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Trans, useTranslation } from 'react-i18next';
import ErrorMessage from '../../components/ErrorMessage/ErrorMessage';
import PosterCard from '../../components/PosterCard/PosterCard';
import PosterGrid from '../../components/PosterGrid/PosterGrid';
import SkeletonRow from '../../components/SkeletonRow/SkeletonRow';
import Slider from '../../components/Slider/Slider';
import TagList from '../../components/TagList/TagList';
import WideCard from '../../components/WideCard/WideCard';
import { SEARCH } from '../../graphql/queries';
import { usePageTitle } from '../../hooks/usePageTitle';
import { searchPath } from '../../utils/routes';
import styles from './SearchPage.module.css';

const KINDS = [
  { value: null, label: (t) => t('All') },
  { value: 'MOVIE', label: (t) => t('Movies'), typename: 'Movie' },
  { value: 'SHOW', label: (t) => t('TV Shows'), typename: 'Show' },
  { value: 'EPISODE', label: (t) => t('Episodes'), typename: 'Episode' },
];

export default function SearchPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const q = params.get('q')?.trim() ?? '';
  const kind = KINDS.find((k) => k.value === params.get('kind')) ?? KINDS[0];
  usePageTitle(q ? t('Search “{{query}}”', { query: q }) : t('Search'));

  const { data, previousData, loading, error, refetch } = useQuery(SEARCH, {
    variables: { query: q, kinds: kind.value ? [kind.value] : undefined, first: kind.value ? 100 : 60 },
    skip: !q,
  });
  const results = (data ?? previousData)?.search.edges.map((e) => e.node) ?? [];

  const setKind = (value) => {
    navigate(searchPath(q, { kind: value }), { replace: true });
  };

  const groups = KINDS.filter((k) => k.typename)
    .map((k) => ({ ...k, items: results.filter((r) => r.__typename === k.typename) }))
    .filter((g) => g.items.length);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          {q ? (
            <Trans
              i18nKey="Results for <q>“{{query}}”</q>"
              values={{ query: q }}
              components={{ q: <span className={styles.query} /> }}
            />
          ) : (
            t('Search')
          )}
        </h1>
        {q && (
          <TagList
            size="sm"
            label={t('Result type')}
            tags={KINDS.map((k) => ({
              key: k.value ?? 'all',
              label: k.label(t),
              active: k.value === kind.value,
              onClick: () => setKind(k.value),
            }))}
          />
        )}
      </header>

      {!q ? (
        <p className={styles.hint}>{t('Type the title of a movie, a show or an episode.')}</p>
      ) : error ? (
        <ErrorMessage error={error} onRetry={() => refetch()} />
      ) : loading && !results.length ? (
        <Slider>
          <SkeletonRow />
        </Slider>
      ) : !results.length ? (
        <p className={styles.hint}>{t('No results for “{{query}}”.', { query: q })}</p>
      ) : kind.value ? (
        <div data-stale={loading || undefined} className={styles.results}>
          {kind.value === 'EPISODE' ? (
            <div className={styles.wideGrid}>
              {results.map((item) => (
                <WideCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <PosterGrid items={results} />
          )}
        </div>
      ) : (
        <div data-stale={loading || undefined} className={styles.results}>
          {groups.map((group) => (
            <Slider key={group.value} title={t('{{label}} ({{total}})', { label: group.label(t), total: group.items.length })}>
              {group.items.map((item) =>
                group.value === 'EPISODE' ? (
                  <WideCard key={item.id} item={item} />
                ) : (
                  <PosterCard key={item.id} item={item} subtitle={[item.year, item.library?.title].filter(Boolean).join(' · ')} />
                ),
              )}
            </Slider>
          ))}
        </div>
      )}
    </div>
  );
}
