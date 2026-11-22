import { useState } from 'react';
import { useParams } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { useTranslation } from 'react-i18next';
import ActionButton from '../../components/ActionButton/ActionButton';
import Backdrop from '../../components/Backdrop/Backdrop';
import DetailHero from '../../components/DetailHero/DetailHero';
import ErrorMessage from '../../components/ErrorMessage/ErrorMessage';
import ItemEditor from '../../components/ItemEditor/ItemEditor';
import MediaInfo from '../../components/MediaInfo/MediaInfo';
import PersonCard from '../../components/PersonCard/PersonCard';
import PlayButton from '../../components/PlayButton/PlayButton';
import PosterCard from '../../components/PosterCard/PosterCard';
import ShareButton from '../../components/ShareButton/ShareButton';
import Slider from '../../components/Slider/Slider';
import Spinner from '../../components/Spinner/Spinner';
import { MOVIE } from '../../graphql/queries';
import { useCanEdit } from '../../hooks/useCanEdit';
import { useCanonicalPath } from '../../hooks/useCanonicalPath';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useWatchToggle } from '../../hooks/useWatchToggle';
import { formatContentRating, formatDay, formatDuration, formatRemaining } from '../../utils/format';
import { libraryPath, moviePath, readParam, tagPath } from '../../utils/routes';
import styles from './MoviePage.module.css';

export default function MoviePage() {
  const { t } = useTranslation();
  const id = readParam(useParams().id);
  const { data, loading, error, refetch } = useQuery(MOVIE, { variables: { id } });
  const movie = data?.node?.__typename === 'Movie' ? data.node : null;
  usePageTitle(movie?.title);
  useCanonicalPath(movie ? moviePath(movie) : null);
  const watch = useWatchToggle(movie);
  const canEdit = useCanEdit(movie?.library?.id);
  const [editing, setEditing] = useState(false);

  if (loading && !data) return <Spinner fullPage />;
  if (error) return <ErrorMessage error={error} onRetry={() => refetch()} />;
  if (!movie) return <ErrorMessage title={t('Movie not found')} />;

  const libId = movie.library?.id;
  const tags = movie.tags;
  const peopleLink = (tag) => ({ key: tag.id, name: tag.name, to: tagPath(libId, tag) });
  const credits = [
    tags.directors.nodes.length && { label: t('Directed by'), people: tags.directors.nodes.map(peopleLink) },
    tags.writers.nodes.length && { label: t('Written by'), people: tags.writers.nodes.map(peopleLink) },
    movie.studio && { label: t('Studio'), people: [{ key: 'studio', name: movie.studio }] },
    movie.releasedOn && { label: t('Released'), people: [{ key: 'date', name: formatDay(movie.releasedOn) }] },
  ].filter(Boolean);

  const resume = movie.watchState?.offsetMs > 0 && !movie.watchState.isWatched;
  const remaining = resume ? formatRemaining(movie.durationMs, movie.watchState.offsetMs) : null;
  const cast = tags.cast.edges;
  const similar = movie.similar.nodes;

  return (
    <div className={styles.page}>
      <Backdrop item={movie} />
      <DetailHero
        item={movie}
        title={movie.title}
        eyebrow={movie.library && { label: movie.library.title, to: libraryPath(libId) }}
        badge={formatContentRating(movie.contentRating)}
        meta={[
          movie.year,
          formatDuration(movie.durationMs),
          movie.originalTitle && movie.originalTitle !== movie.title ? movie.originalTitle : null,
        ]}
        ratings={movie.ratings.nodes}
        fallbackRating={movie.audienceRating}
        tags={tags.genres.nodes.map((g) => ({ key: g.id, label: g.name, to: tagPath(libId, g) }))}
        primaryAction={<PlayButton item={movie} resume={resume} startMs={movie.watchState?.offsetMs} label={remaining ? t('Resume · {{remaining}}', { remaining }) : undefined} />}
        actions={
          <>
            <ActionButton
              icon={watch.isWatched ? 'checkCircle' : 'check'}
              label={watch.isWatched ? t('Watched') : t('Mark as watched')}
              active={watch.isWatched}
              onClick={watch.toggle}
              disabled={watch.loading}
            />
            <ShareButton title={movie.title} />
            {canEdit && <ActionButton icon="edit" label={t('Edit')} onClick={() => setEditing(true)} />}
          </>
        }
        tagline={movie.tagline}
        summary={movie.summary}
        credits={credits}
      />
      {canEdit && <ItemEditor item={movie} open={editing} onClose={() => setEditing(false)} />}

      <div className={styles.sections}>
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

        <MediaInfo versions={movie.versions} />

        {similar.length > 0 && (
          <Slider title={t('You may also like')}>
            {similar.map((item) => (
              <PosterCard key={item.id} item={item} />
            ))}
          </Slider>
        )}
      </div>
    </div>
  );
}
