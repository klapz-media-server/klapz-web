import { useEffect, useSyncExternalStore } from 'react';
import { useQuery } from '@apollo/client/react';
import { SHOW_THEME } from '../graphql/queries';
import { serverUrl } from '../servers/serverStore';
import {
  claimTheme,
  isThemeMusicEnabled,
  playTheme,
  releaseTheme,
  setThemeMusicEnabled,
  subscribeThemeMusic,
} from '../utils/themeMusic';

/** Whether this browser plays theme music, and the setter. */
export function useThemeMusicPreference() {
  const enabled = useSyncExternalStore(subscribeThemeMusic, isThemeMusicEnabled);
  return [enabled, setThemeMusicEnabled];
}

/**
 * Plays the theme of the series `showId` while the calling page is shown (see
 * utils/themeMusic). A series without one, or a server that cannot say, plays nothing.
 */
export function useThemeMusic(showId) {
  const [enabled] = useThemeMusicPreference();
  const { data } = useQuery(SHOW_THEME, { variables: { id: showId }, skip: !enabled || !showId, errorPolicy: 'ignore' });
  const path = data?.node?.theme?.url;

  useEffect(() => {
    if (!enabled || !showId) return undefined;
    claimTheme(showId);
    return () => releaseTheme(showId);
  }, [enabled, showId]);

  useEffect(() => {
    if (enabled && showId && path) playTheme(showId, serverUrl(path));
  }, [enabled, showId, path]);
}
