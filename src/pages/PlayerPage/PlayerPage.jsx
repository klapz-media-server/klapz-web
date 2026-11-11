import { useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { useTranslation } from 'react-i18next';
import StreamPlayer from '../../components/StreamPlayer/StreamPlayer';
import VideoPlayer from '../../components/VideoPlayer/VideoPlayer';
import { PLAYER_ITEM } from '../../graphql/queries';
import { useCanonicalPath } from '../../hooks/useCanonicalPath';
import { usePageTitle } from '../../hooks/usePageTitle';
import { episodeCode } from '../../utils/format';
import { testDecision } from '../../utils/playback';
import { itemPath, playPath, readParam } from '../../utils/routes';
import { resolveStreamUrl } from '../../utils/streams';

/**
 * /play/:id/:slug — plays the item's file through `startStream`.
 *
 * `?t=<ms>` starts at a position (resume). A show plays its first unwatched
 * episode. `?src=sintel|angel-one|bbb|<url>` plays a test manifest instead,
 * with `?decision=play|stream|transcode|slow&speed=…` to preview the badge.
 */
export default function PlayerPage() {
  const { t } = useTranslation();
  const id = readParam(useParams().id);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { data, loading, error } = useQuery(PLAYER_ITEM, { variables: { id }, fetchPolicy: 'network-only' });
  const item = data?.node;
  const testSrc = params.has('src') ? resolveStreamUrl(params) : null;
  const startMs = Number(params.get('t')) || 0;

  // A show: play its first unwatched episode (or the first one).
  useEffect(() => {
    if (item?.__typename !== 'Show') return;
    const episodes = item.episodes?.nodes ?? [];
    const next = episodes.find((e) => !e.watchState?.isWatched) ?? episodes[0];
    if (!next) return;
    navigate(playPath(next, next.watchState?.offsetMs), { replace: true });
  }, [item, navigate]);

  let title = item?.title ?? '';
  let subtitle = null;
  let posterGuid = item?.guid;
  if (item?.__typename === 'Episode') {
    subtitle = [item.show?.title, episodeCode(item.season?.number, item.number)].filter(Boolean).join(' · ');
    title = item.title || t('Episode {{number}}', { number: item.number });
    posterGuid = item.show?.guid ?? item.guid;
  } else if (item?.__typename === 'Movie') {
    subtitle = item.year ? String(item.year) : null;
  }
  usePageTitle(title ? t('Playing {{title}}', { title }) : t('Player'));
  useCanonicalPath(item && item.__typename !== 'Show' ? playPath(item) : null);

  const goBack = () => {
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate(item ? itemPath(item) : '/');
  };

  const common = { title, subtitle, posterGuid, onBack: goBack };

  if (testSrc) {
    return <VideoPlayer {...common} src={testSrc} decision={testDecision(params)} source={item?.versions?.[0]} />;
  }

  const version = item?.versions?.[0];
  const file = version?.files?.[0];
  if (item && item.__typename !== 'Show' && file) {
    return <StreamPlayer key={file.id} {...common} item={item} version={version} file={file} startMs={startMs} />;
  }

  // Loading, a show being redirected, or nothing to play.
  const failed =
    !loading && (error || !item || (item.__typename !== 'Show' && !file))
      ? { title: t('Playback failed'), detail: error ? error.message : t('There is no file to play for this item.') }
      : null;
  return <VideoPlayer {...common} src={null} preparing={!failed} error={failed} />;
}
