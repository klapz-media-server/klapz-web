import { useQuery } from '@apollo/client/react';
import { useTranslation } from 'react-i18next';
import ErrorMessage from '../../components/ErrorMessage/ErrorMessage';
import MediaRow from '../../components/MediaRow/MediaRow';
import Spinner from '../../components/Spinner/Spinner';
import Spotlight from '../../components/Spotlight/Spotlight';
import TagList from '../../components/TagList/TagList';
import { CONTINUE_WATCHING, LIBRARIES, LIBRARY_INFO, RECENTLY_ADDED, SPOTLIGHT } from '../../graphql/queries';
import { usePageTitle } from '../../hooks/usePageTitle';
import { libraryPath, tagPath } from '../../utils/routes';
import styles from './HomePage.module.css';

// One shuffle per visit, stable across re-renders and back navigation.
const SESSION_SEED = Math.floor(Math.random() * 100000);

function GenreBar({ library }) {
  const { t } = useTranslation();
  const { data } = useQuery(LIBRARY_INFO, { variables: { id: library.id } });
  const genres = data?.node?.genres?.nodes ?? [];
  if (!genres.length) return null;
  return (
    <section className={styles.genres}>
      <h2 className={styles.sectionTitle}>
        {t('Browse by genre')} <span className={styles.sectionHint}>{library.title}</span>
      </h2>
      <TagList
        scroll
        label={t('Genres')}
        tags={genres.map((g) => ({ key: g.id, label: g.name, to: tagPath(library.id, g) }))}
      />
    </section>
  );
}

function SpotlightBlock({ library }) {
  const { data } = useQuery(SPOTLIGHT, { variables: { id: library.id, seed: SESSION_SEED } });
  if (!data) return <div className={styles.spotlightPlaceholder} />;
  return <Spotlight items={data.node?.items?.nodes ?? []} />;
}

export default function HomePage() {
  const { t } = useTranslation();
  usePageTitle(t('Home'));
  const { data, loading, error, refetch } = useQuery(LIBRARIES);

  if (loading && !data) return <Spinner fullPage />;
  if (error) return <ErrorMessage title={t('Server unreachable')} error={error} onRetry={() => refetch()} />;

  const libraries = data.libraries.nodes.filter((l) => !l.hidden && (l.kind === 'MOVIE' || l.kind === 'SHOW'));
  const firstMovies = libraries.find((l) => l.kind === 'MOVIE');
  const firstShows = libraries.find((l) => l.kind === 'SHOW');

  return (
    <div className={styles.page}>
      {firstMovies ? <SpotlightBlock library={firstMovies} /> : <div className={styles.spacer} />}

      <MediaRow
        title={t('Continue watching')}
        query={CONTINUE_WATCHING}
        variables={{ first: 20 }}
        variant="wide"
        select={(d) => d.continueWatching.edges.map((e) => e.node)}
      />

      {firstMovies && <GenreBar library={firstMovies} />}

      {libraries.map((lib) => (
        <MediaRow
          key={lib.id}
          title={t('Recently added in {{library}}', { library: lib.title })}
          to={libraryPath(lib.id, { view: 'all', sort: 'ADDED_AT' })}
          query={RECENTLY_ADDED}
          variables={{ id: lib.id, first: 24 }}
          select={(d) => d.node?.recentlyAdded?.nodes}
        />
      ))}

      {firstShows && <GenreBar library={firstShows} />}
    </div>
  );
}
