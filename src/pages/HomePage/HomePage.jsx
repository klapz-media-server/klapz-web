import { useEffect, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { useTranslation } from 'react-i18next';
import Button, { ButtonLink } from '../../components/Button/Button';
import EmptyState from '../../components/EmptyState/EmptyState';
import ErrorMessage from '../../components/ErrorMessage/ErrorMessage';
import MediaRow from '../../components/MediaRow/MediaRow';
import Spinner from '../../components/Spinner/Spinner';
import LibraryEditor from '../../components/LibraryEditor/LibraryEditor';
import Spotlight from '../../components/Spotlight/Spotlight';
import TagList from '../../components/TagList/TagList';
import { CONTINUE_WATCHING, LIBRARIES, LIBRARY_INFO, RECENTLY_ADDED, SPOTLIGHT } from '../../graphql/queries';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useViewer } from '../../hooks/useViewer';
import { libraryPath, tagPath } from '../../utils/routes';
import styles from './HomePage.module.css';

// One shuffle per visit, stable across re-renders and back navigation.
const SESSION_SEED = Math.floor(Math.random() * 100000);
/** How often a home page with nothing to show asks again while a library is being scanned. */
const SCAN_REFRESH_MS = 5000;

/** No library at all: an owner is offered to create one, anyone else is told none is shared. */
function NoLibrary({ owner }) {
  const { t } = useTranslation();
  const [creating, setCreating] = useState(false);
  if (!owner) {
    return (
      <EmptyState
        icon="grid"
        title={t('No library has been shared with you yet')}
        description={t('Ask an owner of this server to give you access to a library. It will show up here.')}
      />
    );
  }
  return (
    <>
      <EmptyState
        icon="folder"
        title={t('Create your first library')}
        description={t('Point Klapz at a folder of movies or shows on this server: it scans it and fills this page.')}
        actions={
          <Button variant="accent" icon="plus" onClick={() => setCreating(true)}>
            {t('Create a library')}
          </Button>
        }
      />
      <LibraryEditor open={creating} library={null} onClose={() => setCreating(false)} />
    </>
  );
}

/** Libraries, none holding anything yet: being scanned, or empty. */
function NothingYet({ libraries, owner }) {
  const { t } = useTranslation();
  const scanning = libraries.some((l) => l.scanning);
  const action = owner ? (
    <ButtonLink to="/servers/libraries" variant="primary" icon="settings">
      {t('Manage libraries')}
    </ButtonLink>
  ) : libraries.length === 1 ? (
    <ButtonLink to={libraryPath(libraries[0].id)} variant="secondary">
      {t('Open {{library}}', { library: libraries[0].title })}
    </ButtonLink>
  ) : null;
  return scanning ? (
    <EmptyState
      live
      busy
      title={t('Your libraries are being scanned')}
      description={t('Movies and shows appear here as they are found.')}
      actions={action}
    />
  ) : (
    <EmptyState
      live
      icon="movie"
      title={t('Your libraries are empty')}
      description={
        owner
          ? t('No movie or show was found in their folders. Check the folders and scan them again.')
          : t('Nothing has been added to them yet.')
      }
      actions={action}
    />
  );
}

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
  const { owner } = useViewer();
  const { data, loading, error, refetch, startPolling, stopPolling } = useQuery(LIBRARIES);

  const all = data?.libraries.nodes ?? [];
  const libraries = all.filter((l) => !l.hidden && (l.kind === 'MOVIE' || l.kind === 'SHOW'));
  // A library known to hold nothing is left out; one whose count is unknown is kept.
  const filled = libraries.filter((l) => l.stats?.itemCount !== 0);
  const waitingForScan = !!data && filled.length === 0 && libraries.some((l) => l.scanning);

  // Nothing to show while a scan runs: ask again until something arrives.
  useEffect(() => {
    if (!waitingForScan) return undefined;
    startPolling(SCAN_REFRESH_MS);
    return () => stopPolling();
  }, [waitingForScan, startPolling, stopPolling]);

  if (loading && !data) return <Spinner fullPage />;
  if (error) return <ErrorMessage title={t('Server unreachable')} error={error} onRetry={() => refetch()} />;

  if (filled.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.spacer} />
        {all.length === 0 ? <NoLibrary owner={owner} /> : <NothingYet libraries={libraries.length ? libraries : all} owner={owner} />}
      </div>
    );
  }

  const firstMovies = filled.find((l) => l.kind === 'MOVIE');
  const firstShows = filled.find((l) => l.kind === 'SHOW');

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

      {filled.map((lib) => (
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
