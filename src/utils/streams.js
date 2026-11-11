/**
 * Test DASH streams, used until the server exposes real manifests.
 * `?src=<url>` on the player page, or VITE_TEST_MPD, override the default.
 */
export const TEST_STREAMS = [
  {
    id: 'sintel',
    label: 'Sintel',
    url: 'https://storage.googleapis.com/shaka-demo-assets/sintel/dash.mpd',
  },
  {
    id: 'angel-one',
    label: 'Angel One',
    url: 'https://storage.googleapis.com/shaka-demo-assets/angel-one/dash.mpd',
  },
  {
    id: 'bbb',
    label: 'Big Buck Bunny',
    url: 'https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd',
  },
];

export function resolveStreamUrl(searchParams) {
  const src = searchParams.get('src');
  if (src) return TEST_STREAMS.find((s) => s.id === src)?.url ?? src;
  return import.meta.env.VITE_TEST_MPD || TEST_STREAMS[0].url;
}
