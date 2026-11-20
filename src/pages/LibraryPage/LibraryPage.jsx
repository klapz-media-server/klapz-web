import { useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { useTranslation } from 'react-i18next';
import Button from '../../components/Button/Button';
import Dropdown, { DropdownItem } from '../../components/Dropdown/Dropdown';
import ErrorMessage from '../../components/ErrorMessage/ErrorMessage';
import Icon from '../../components/Icon/Icon';
import JumpBar, { letterOffsets } from '../../components/JumpBar/JumpBar';
import LibraryDeleteDialog from '../../components/LibraryDeleteDialog/LibraryDeleteDialog';
import LibraryEditor from '../../components/LibraryEditor/LibraryEditor';
import MediaRow from '../../components/MediaRow/MediaRow';
import PosterGrid from '../../components/PosterGrid/PosterGrid';
import ScanButton from '../../components/ScanButton/ScanButton';
import Spinner from '../../components/Spinner/Spinner';
import TagList from '../../components/TagList/TagList';
import VirtualPosterGrid from '../../components/VirtualPosterGrid/VirtualPosterGrid';
import { LIBRARY_INFO, LIBRARY_ITEMS, LIBRARY_LISTING, LIBRARY_PAGE, RECENTLY_ADDED, TAG_NAME } from '../../graphql/queries';
import { useCanEdit } from '../../hooks/useCanEdit';
import { useOffsetPages } from '../../hooks/useOffsetPages';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useViewer } from '../../hooks/useViewer';
import { formatNumber } from '../../utils/format';
import { libraryPath, queryString, readParam, tagPath } from '../../utils/routes';
import styles from './LibraryPage.module.css';

const SORTS = [
  { value: 'TITLE', label: (t) => t('Title'), dir: 'ASCENDING' },
  { value: 'ADDED_AT', label: (t) => t('Date added'), dir: 'DESCENDING' },
  { value: 'RELEASED_ON', label: (t) => t('Release date'), dir: 'DESCENDING' },
  { value: 'AUDIENCE_RATING', label: (t) => t('Audience rating'), dir: 'DESCENDING' },
  { value: 'RATING', label: (t) => t('Critic rating'), dir: 'DESCENDING' },
  { value: 'DURATION', label: (t) => t('Duration'), dir: 'DESCENDING' },
  { value: 'LAST_VIEWED_AT', label: (t) => t('Last watched'), dir: 'DESCENDING' },
  { value: 'RANDOM', label: (t) => t('Random'), dir: 'ASCENDING' },
];

const TAG_KIND_LABELS = {
  GENRE: (t) => t('Genre'),
  ACTOR: (t) => t('Actor'),
  DIRECTOR: (t) => t('Director'),
  WRITER: (t) => t('Writer'),
  PRODUCER: (t) => t('Producer'),
  COUNTRY: (t) => t('Country'),
};

/** Items per request of the full listing; the grid asks only for the pages it shows. */
const PAGE_SIZE = 60;
const selectPage = (data) => data?.node?.items?.edges.map((e) => e.node);
const RANDOM_SEED = Math.floor(Math.random() * 100000);

function Recommended({ libraryId, kind, genres }) {
  const { t } = useTranslation();
  const topGenres = genres.slice(0, 8);
  return (
    <>
      <MediaRow
        title={t('Recently added')}
        to={libraryPath(libraryId, { view: 'all', sort: 'ADDED_AT' })}
        query={RECENTLY_ADDED}
        variables={{ id: libraryId, first: 30 }}
        select={(d) => d.node?.recentlyAdded?.nodes}
      />
      <MediaRow
        title={t('Top rated')}
        to={libraryPath(libraryId, { view: 'all', sort: 'AUDIENCE_RATING' })}
        query={LIBRARY_ITEMS}
        variables={{ id: libraryId, first: 30, orderBy: 'AUDIENCE_RATING', direction: 'DESCENDING' }}
        select={(d) => d.node?.items?.edges.map((e) => e.node)}
      />
      <MediaRow
        title={kind === 'SHOW' ? t('Shows to discover') : t('Movies to discover')}
        subtitle={t('A random pick from your library')}
        to={libraryPath(libraryId, { view: 'all', sort: 'RANDOM' })}
        query={LIBRARY_ITEMS}
        variables={{ id: libraryId, first: 30, orderBy: 'RANDOM', seed: RANDOM_SEED, filter: { watched: false } }}
        select={(d) => d.node?.items?.edges.map((e) => e.node)}
      />
      {topGenres.map((genre) => (
        <MediaRow
          key={genre.id}
          title={genre.name}
          to={tagPath(libraryId, genre)}
          query={LIBRARY_ITEMS}
          variables={{
            id: libraryId,
            first: 30,
            orderBy: 'ADDED_AT',
            direction: 'DESCENDING',
            filter: { tags: [{ kind: 'GENRE', ids: [genre.id] }] },
          }}
          select={(d) => d.node?.items?.edges.map((e) => e.node)}
        />
      ))}
    </>
  );
}

function ActiveTag({ tagId, onClear }) {
  const { t } = useTranslation();
  const { data } = useQuery(TAG_NAME, { variables: { id: tagId } });
  const tag = data?.node;
  return (
    <span className={styles.activeTag}>
      {tag?.person?.thumbUrl && <img src={tag.person.thumbUrl} alt="" className={styles.activeTagAvatar} />}
      <span className={styles.activeTagKind}>{TAG_KIND_LABELS[tag?.kind]?.(t) ?? t('Filter')}</span>
      <span className={styles.activeTagName}>{tag?.name ?? '…'}</span>
      <button type="button" onClick={onClear} aria-label={t('Remove filter')} className={styles.activeTagClear}>
        <Icon name="close" size={14} />
      </button>
    </span>
  );
}

function AllItems({ libraryId, genres, params }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const sort = SORTS.find((s) => s.value === params.get('sort')) ?? SORTS[0];
  const direction = params.get('dir') ?? sort.dir;
  const tagId = params.get('tag');
  const tagKind = params.get('kind') ?? 'GENRE';
  const unwatched = params.get('unwatched') === '1';

  const filter = useMemo(() => {
    const f = {};
    if (tagId) f.tags = [{ kind: tagKind, ids: [tagId] }];
    if (unwatched) f.watched = false;
    return Object.keys(f).length ? f : undefined;
  }, [tagId, tagKind, unwatched]);

  // The letters only mean something in title order.
  const byTitle = sort.value === 'TITLE';
  const listing = useQuery(LIBRARY_LISTING, { variables: { id: libraryId, filter, letters: byTitle } });
  // While another filter's count loads, the grid keeps the last one rather than vanishing.
  const stats = (listing.data ?? listing.previousData)?.node?.stats;
  const total = stats?.itemCount;
  const buckets = listing.data?.node?.stats?.firstCharacters;

  const variables = useMemo(
    () => ({
      id: libraryId,
      orderBy: sort.value,
      direction,
      filter,
      seed: sort.value === 'RANDOM' ? RANDOM_SEED : undefined,
    }),
    [libraryId, sort.value, direction, filter],
  );
  const pages = useOffsetPages({ query: LIBRARY_PAGE, variables, select: selectPage, pageSize: PAGE_SIZE, total });
  const error = listing.error ?? (pages.loaded ? null : pages.error);

  const gridRef = useRef(null);
  const [firstVisible, setFirstVisible] = useState(0);
  const letters = useMemo(() => (byTitle && buckets ? letterOffsets(buckets, direction) : []), [byTitle, buckets, direction]);

  const update = (changes) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) {
      if (v == null || v === '') next.delete(k);
      else next.set(k, v);
    }
    next.set('view', 'all');
    // Navigated rather than setParams(), which would write ids' "=" as %3D.
    navigate(`${location.pathname}${queryString(Object.fromEntries(next))}`, { replace: true, state: { keepScroll: true } });
  };

  const genreTags = [
    { key: 'all', label: t('All'), active: !tagId, onClick: () => update({ tag: null, kind: null }) },
    ...genres.map((g) => ({
      key: g.id,
      label: g.name,
      active: tagId === g.id,
      onClick: () => update({ tag: g.id, kind: 'GENRE' }),
    })),
  ];
  const showGenreChips = !tagId || tagKind === 'GENRE';

  return (
    <>
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <Dropdown label={sort.label(t)} icon="sort" buttonClassName={styles.toolButton}>
            {(close) =>
              SORTS.map((s) => (
                <DropdownItem
                  key={s.value}
                  active={s.value === sort.value}
                  onClick={() => {
                    close();
                    update({ sort: s.value, dir: null });
                  }}
                >
                  {s.label(t)}
                </DropdownItem>
              ))
            }
          </Dropdown>
          {sort.value !== 'RANDOM' && (
            <button
              type="button"
              className={styles.toolButton}
              onClick={() => update({ dir: direction === 'ASCENDING' ? 'DESCENDING' : 'ASCENDING' })}
              title={t('Reverse order')}
            >
              {direction === 'ASCENDING' ? t('Ascending') : t('Descending')}
            </button>
          )}
          <button
            type="button"
            className={styles.toolButton}
            data-active={unwatched || undefined}
            aria-pressed={unwatched}
            onClick={() => update({ unwatched: unwatched ? null : '1' })}
          >
            <Icon name="eyeOff" size={16} />
            {t('Unwatched')}
          </button>
          {tagId && tagKind !== 'GENRE' && <ActiveTag tagId={tagId} onClear={() => update({ tag: null, kind: null })} />}
        </div>
        {total != null && (
          <span className={styles.count}>
            {t('{{formattedCount}} item', { count: total, formattedCount: formatNumber(total) })}
          </span>
        )}
      </div>

      {showGenreChips && genres.length > 0 && (
        <TagList scroll size="sm" tags={genreTags} label={t('Filter by genre')} className={styles.genreChips} />
      )}

      {error ? (
        <ErrorMessage error={error} onRetry={() => listing.refetch()} />
      ) : total == null ? (
        <PosterGrid items={[]} skeletonCount={24} />
      ) : total === 0 ? (
        <p className={styles.empty}>{t('No items match these filters.')}</p>
      ) : (
        <div className={styles.listing} data-letters={letters.length > 1 || undefined}>
          <VirtualPosterGrid
            ref={gridRef}
            total={total}
            item={pages.item}
            onRange={pages.request}
            onFirstVisible={setFirstVisible}
            resetKey={JSON.stringify(variables)}
            className={styles.grid}
          />
          {letters.length > 1 && (
            <JumpBar letters={letters} current={firstVisible} onJump={(offset) => gridRef.current?.scrollToIndex(offset)} />
          )}
        </div>
      )}
    </>
  );
}

export default function LibraryPage() {
  const { t } = useTranslation();
  const id = readParam(useParams().id);
  const [params] = useSearchParams();
  const view = params.get('view') === 'all' ? 'all' : 'recommended';
  const { data, loading, error, refetch } = useQuery(LIBRARY_INFO, { variables: { id } });
  const library = data?.node;
  usePageTitle(library?.title);
  const navigate = useNavigate();
  const canEdit = useCanEdit(id);
  const { owner } = useViewer();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(null);

  if (loading && !data) return <Spinner fullPage />;
  if (error) return <ErrorMessage error={error} onRetry={() => refetch()} />;
  if (!library) return <ErrorMessage title={t('Library not found')} />;

  const genres = library.genres?.nodes ?? [];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <span className={styles.kindIcon}>
            <Icon name={library.kind === 'SHOW' ? 'tv' : 'movie'} size={22} />
          </span>
          <h1 className={styles.title}>{library.title}</h1>
          {canEdit && (
            <div className={styles.manage}>
              <ScanButton libraryId={id} />
              <Button size="sm" variant="ghost" icon="edit" aria-label={t('Edit the library')} title={t('Edit the library')} onClick={() => setEditing(true)} />
              {owner && (
                <Button
                  size="sm"
                  variant="ghost"
                  icon="trash"
                  aria-label={t('Delete the library')}
                  title={t('Delete the library')}
                  onClick={() => setDeleting(library)}
                />
              )}
            </div>
          )}
        </div>
        <nav className={styles.tabs} aria-label={t('Library views')}>
          <Link
            to={libraryPath(id)}
            className={styles.tab}
            aria-current={view === 'recommended' ? 'page' : undefined}
          >
            {t('Recommended')}
          </Link>
          <Link
            to={libraryPath(id, { view: 'all' })}
            className={styles.tab}
            aria-current={view === 'all' ? 'page' : undefined}
          >
            {t('Library')}
          </Link>
        </nav>
      </header>

      {view === 'recommended' ? (
        <>
          {genres.length > 0 && (
            <TagList
              scroll
              label={t('Genres')}
              className={styles.recommendedGenres}
              tags={genres.map((g) => ({ key: g.id, label: g.name, to: tagPath(id, g) }))}
            />
          )}
          <Recommended libraryId={id} kind={library.kind} genres={genres} />
        </>
      ) : (
        <AllItems key={id} libraryId={id} genres={genres} params={params} />
      )}

      <LibraryEditor open={editing} library={{ id }} onClose={() => setEditing(false)} />
      <LibraryDeleteDialog library={deleting} onClose={() => setDeleting(null)} onDeleted={() => navigate('/', { replace: true })} />
    </div>
  );
}
