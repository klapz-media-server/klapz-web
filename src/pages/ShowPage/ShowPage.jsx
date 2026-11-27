import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { useTranslation } from 'react-i18next';
import ActionButton from '../../components/ActionButton/ActionButton';
import Backdrop from '../../components/Backdrop/Backdrop';
import DetailHero from '../../components/DetailHero/DetailHero';
import EpisodeList from '../../components/EpisodeList/EpisodeList';
import ErrorMessage from '../../components/ErrorMessage/ErrorMessage';
import ItemEditor from '../../components/ItemEditor/ItemEditor';
import PersonCard from '../../components/PersonCard/PersonCard';
import PlayButton from '../../components/PlayButton/PlayButton';
import PosterCard from '../../components/PosterCard/PosterCard';
import ShareButton from '../../components/ShareButton/ShareButton';
import Slider from '../../components/Slider/Slider';
import Spinner from '../../components/Spinner/Spinner';
import { SEASON_EPISODES, SHOW } from '../../graphql/queries';
import { useCanEdit } from '../../hooks/useCanEdit';
import { useCanonicalPath } from '../../hooks/useCanonicalPath';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useThemeMusic } from '../../hooks/useThemeMusic';
import { useWatchToggle } from '../../hooks/useWatchToggle';
import { episodeCount, formatContentRating, seasonCount, seasonLabel } from '../../utils/format';
import { libraryPath, readParam, seasonPath, showPath, tagPath } from '../../utils/routes';
import styles from './ShowPage.module.css';

function pickDefaultSeason(seasons) {
  const regular = seasons.filter((s) => s.number > 0);
  const pool = regular.length ? regular : seasons;
  return pool.find((s) => s.stats.watchedEpisodeCount < s.stats.episodeCount) ?? pool[0];
}

function SeasonEpisodes({ season, onEdit }) {
  useTranslation();
  const { data, loading, error, refetch } = useQuery(SEASON_EPISODES, { variables: { id: season.id } });
  const node = data?.node;
  return (
    <section className={styles.episodes} aria-labelledby="episodes-title">
      <header className={styles.episodesHeader}>
        <h2 id="episodes-title" className={styles.sectionTitle}>
          {seasonLabel(season)}
        </h2>
        <span className={styles.sectionHint}>{episodeCount(season.stats.episodeCount)}</span>
      </header>
      {node?.summary && <p className={styles.seasonSummary}>{node.summary}</p>}
      {error ? (
        <ErrorMessage error={error} onRetry={() => refetch()} />
      ) : loading && !data ? (
        <Spinner />
      ) : (
        <EpisodeList episodes={node?.episodes?.nodes ?? []} onEdit={onEdit} />
      )}
    </section>
  );
}

export default function ShowPage() {
  const { t } = useTranslation();
  const routeParams = useParams();
  const id = readParam(routeParams.id);
  const [params] = useSearchParams();
  // /show/<id>/<slug>/<seasonId>/<seasonSlug>, or ?season=<id> on older links.
  const seasonId = readParam(routeParams.seasonId) ?? params.get('season');
  const { data, loading, error, refetch } = useQuery(SHOW, { variables: { id } });
  const show = data?.node?.__typename === 'Show' ? data.node : null;
  usePageTitle(show?.title);
  // The series' page and its seasons' share one theme, kept playing from one to the other.
  useThemeMusic(id);
  const routeSeason = show?.seasons.nodes.find((s) => s.id === seasonId);
  useCanonicalPath(show ? (routeSeason ? seasonPath(show, routeSeason) : showPath(show)) : null, {
    dropQuery: ['season'],
  });
  const watch = useWatchToggle(show);
  const canEdit = useCanEdit(show?.library?.id);
  // The series itself, or one of its episodes.
  const [editing, setEditing] = useState(null);

  if (loading && !data) return <Spinner fullPage />;
  if (error) return <ErrorMessage error={error} onRetry={() => refetch()} />;
  if (!show) return <ErrorMessage title={t('Show not found')} />;

  const libId = show.library?.id;
  const tags = show.tags;
  const seasons = show.seasons.nodes;
  const chosen = seasons.find((s) => s.id === seasonId);
  const selected = chosen ?? pickDefaultSeason(seasons);
  const { stats } = show;

  const peopleLink = (tag) => ({ key: tag.id, name: tag.name, to: tagPath(libId, tag) });
  const credits = [
    tags.directors.nodes.length && { label: t('Created by'), people: tags.directors.nodes.map(peopleLink) },
    show.studio && { label: t('Studio'), people: [{ key: 'studio', name: show.studio }] },
  ].filter(Boolean);
  const cast = tags.cast.edges;
  const similar = show.similar.nodes;
  const seasonItem = (s) => ({ ...s, __typename: 'Season', show: { id: show.id, slug: show.slug, title: show.title, guid: show.guid, images: show.images } });

  return (
    <div className={styles.page}>
      <Backdrop item={show} />
      <DetailHero
        item={show}
        title={show.title}
        eyebrow={show.library && { label: show.library.title, to: libraryPath(libId) }}
        badge={formatContentRating(show.contentRating)}
        meta={[
          show.year,
          seasonCount(stats.seasonCount),
          episodeCount(stats.episodeCount),
          stats.watchedEpisodeCount > 0 && t('{{count}} watched', { count: stats.watchedEpisodeCount }),
        ]}
        ratings={show.ratings.nodes}
        fallbackRating={show.audienceRating}
        tags={tags.genres.nodes.map((g) => ({ key: g.id, label: g.name, to: tagPath(libId, g) }))}
        primaryAction={<PlayButton item={show} />}
        actions={
          <>
            <ActionButton
              icon={watch.isWatched ? 'checkCircle' : 'check'}
              label={watch.isWatched ? t('Watched') : t('Mark as watched')}
              active={watch.isWatched}
              onClick={watch.toggle}
              disabled={watch.loading}
            />
            <ShareButton title={show.title} />
            {canEdit && <ActionButton icon="edit" label={t('Edit')} onClick={() => setEditing(show)} />}
          </>
        }
        tagline={show.tagline}
        summary={show.summary}
        credits={credits}
      />
      {canEdit && <ItemEditor item={editing} open={!!editing} onClose={() => setEditing(null)} />}

      <div className={styles.sections}>
        {seasons.length > 1 && (
          <Slider title={t('Seasons')}>
            {seasons.map((s) => (
              <PosterCard
                key={s.id}
                item={seasonItem(s)}
                title={seasonLabel(s)}
                subtitle={episodeCount(s.stats.episodeCount)}
                active={s.id === selected?.id}
                replace
              />
            ))}
          </Slider>
        )}

        {selected && <SeasonEpisodes key={selected.id} season={selected} onEdit={canEdit ? setEditing : undefined} />}

        {cast.length > 0 && (
          <Slider title={t('Cast')}>
            {cast.map(({ node, character }) => (
              <PersonCard
                key={node.id}
                name={node.name}
                role={character}
                thumbUrl={node.person?.thumbUrl}
                to={tagPath(libId, node)}
              />
            ))}
          </Slider>
        )}

        {similar.length > 0 && (
          <Slider title={t('Similar shows')}>
            {similar.map((item) => (
              <PosterCard key={item.id} item={item} />
            ))}
          </Slider>
        )}
      </div>
    </div>
  );
}
