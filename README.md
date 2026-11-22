# Klapz — web client

Web client (React 19 + Vite 8 + Apollo Client 4) for the **Klapz** media server, in the spirit of watch.plex.tv / Plex Web: pill navigation bar, genre tags, horizontal sliders, movie and show pages with a backdrop.

## Getting started

```bash
npm install
npm run dev        # http://localhost:5180
```

The page talks to the server chosen on `/connect` directly (for a local one, `127.0.0.1:32500`), which must
allow the dev server's origin (see [Choosing the server](#choosing-the-server)).

## URLs

Every URL is built in `src/utils/routes.js`. An item's URL is `/<type>/<id>/<slug>`, with the id as it is (`=` included):

- `/movie/SXRlbTo1NzY5NDc=/les-croods`
- `/show/SXRlbTo1NzcxOTQ=/solo-leveling`, a season: `/show/<id>/solo-leveling/<seasonId>/solo-leveling-s02`
- `/play/<id>/<slug>` (`?t=<ms>` to resume)

The slug comes from the API. It is a name, not an identity: pages load by id, and `useCanonicalPath` rewrites the address
(without a new history entry) when the slug is missing or out of date, which keeps old `/movie/<id>` and
`/show/<id>?season=<id>` links working. In query strings too, the `=` of ids stays readable (`?tag=VGFnOjEyMg==`).

## Posters and backdrops

The GraphQL API exposes no images yet. The Vite plugin `server/artworkPlugin.js` serves `/artwork?guid=plex://…&type=poster|background|logo|thumb`:
it resolves the guid through Plex's metadata provider, then redirects to the `images.plex.tv` resizer.
The plex.tv token stays on the server: it comes from `PLEX_TOKEN` (`.env.local`), or else from the local Plex Media Server's registry key on Windows.
Without a token, or for `local://` items, the UI shows a generated placeholder.

## Player (Shaka Player)

"Play" opens `/play/:id`, a full-screen player on Shaka Player 5 with a custom interface (not the Shaka UI):
top bar (back, title), seek bar with hover and drag, ±10 s / +30 s, volume, audio and subtitles panel,
quality (Auto/ABR or fixed), speed, playback info, picture-in-picture, full screen, controls hidden after 3 s.
A click on the picture pauses / resumes, a double click toggles full screen.

### Real playback (`startStream`)

`components/StreamPlayer` plays the item's first file:

- **Client-side decision** (`utils/capabilities.js`): `directPlay` when the browser reads the container and codecs as they
  are (MP4/WebM, default audio track, no subtitles); otherwise DASH, with `convertAudio` when the audio cannot be decoded
  (AC3, DTS…). A Direct Play the browser refuses falls back to Direct Stream on its own.
- **Client-side adaptive** (`quality: CLIENT_ADAPTIVE`): the default whenever the file cannot be played as it is, and for a
  video the browser cannot decode (HEVC…). The manifest lists the copied video, with its real codec, then each encoding;
  Shaka picks by bandwidth and leaves out a copy it cannot decode by itself. The server adapts nothing.
- **Tracks and quality** come from the file (GraphQL): audio, subtitles (text → ASS served beside the stream, image →
  burned in), *Original* quality (Direct Play, or copied video), *Auto*, or a bitrate cap (`maxVideoBitrate`). In *Auto*,
  the menu lists the manifest's qualities under "Auto (currently 720p)": picking one pins it in the player without
  restarting the stream, and "Auto" hands control back to ABR. Other changes restart the stream at the current position;
  the old one is stopped (`stopStream`).
- **Reporting**: `reportPlayback` (extends the session, which expires after 5 min) and `reportViewing` (resume position,
  watched/unwatched) every 10 s and on each play / pause; on exit (tab close included, through `fetch keepalive`): last
  position, `STOPPED`, `stopStream`.
- **Resume**: `/play/:id?t=<ms>`; "Resume" and in-progress episodes pass their position. A show plays its first unwatched episode.
- The badge and the *Info* tab show the server's decision (`delivery`, `videoDecision`, `audioDecision`).
  The API does not give the transcoding speed yet (`decisionFromStream` will read `transcodeSpeed` once it exists).

### Test streams

`?src=sintel|angel-one|bbb|<url of a .mpd>` (or `VITE_TEST_MPD`) plays a test manifest instead
(`src/utils/streams.js`), with a simulated decision `?decision=play|stream|transcode|slow&speed=2.3`.

Shortcuts: `Space`/`k` play-pause, `←` −10 s, `→`/`l` +30 s, `↑`/`↓` volume, `m` mute, `c` subtitles, `f` full screen, `p` picture-in-picture, `i` playback info.

Code: `hooks/useStreamSession.js` (startStream / stopStream), `hooks/useServerTrackOptions.js`, `hooks/useShakaPlayer.js` (Shaka instance), `hooks/useMediaState.js` (video state),
`components/StreamPlayer` (real playback), `components/VideoPlayer` (interface) + `SeekBar`, `VolumeControl`, `PlayerSettings`, `PlaybackInfo`, `StreamBadge`, `PlayerIconButton`, `PlayerFeedback`.

## Choosing the server

- **`/connect`** (`pages/ConnectPage`) comes before everything: without a server chosen, `components/ServerGate`
  sends any address there, then back (`?next=…`). With no server known it is an onboarding screen asking for one.
- **Finding it** (`servers/probe.js`): the address typed (IP, domain, optional port, scheme or path) gives the
  addresses to try — HTTPS then HTTP on 443 and 80, then port 32500 — all at once; the best one answering
  `{ server { machineIdentifier } }` wins. Each attempt is shown live. A server that answers but refuses this page's
  origin (CORS) is told apart from one that is down. From an HTTPS page, HTTP addresses are left out (mixed content).
- **The list** (`servers/serverStore.js`, `localStorage` key `klapz.servers`): servers are added, switched and
  removed on `/connect`, also reached from the account menu, the sign-in page and the "server unreachable" screen.
  Each one's state (online, unreachable, access refused, not Klapz) is asked again every 30 s while shown.
  `hooks/useServers.js` exposes the list and the actions; `useSwitchServer` empties the Apollo cache and starts the
  app over on the new server (its own sign-in cookie decides what comes next).
- Everything that talks to the server goes through `serverUrl()`: `/graphql` (Apollo, beacons), stream and subtitle
  paths from `startStream`, the Jellyfin address. A `?ticket=` address makes the page's own origin the server in use.
- **A server on another origin** must allow this page's origin for `/graphql` and `/streams` (CORS with credentials),
  and send its session cookie as `SameSite=None; Secure`. Served by the server itself (`/web/`), the page's own
  address is suggested and needs neither.

## Account, settings and administration

- **Everything requires signing in** (`components/SessionGate`): without a session, the app shows only `/sign-in` and
  `/sign-up`; any other address redirects to `/sign-in?next=…`, then comes back to the requested page. `next` is only
  followed when it names a page of the app (`safeNext` in `utils/routes.js`: no `//elsewhere`, no `https://…`, not the
  sign-in pages themselves). There is no anonymous mode and no trusted network: every request is a user's.
- **Sign-in** (`pages/AuthPage`): username **or** e-mail, and password. The refusals `INVALID_CREDENTIALS` (the same
  answer for an unknown account and a wrong password), `INACTIVE` and `TOO_MANY_ATTEMPTS` (five failures in fifteen
  minutes) each have their own message. The server answers with a session cookie (JWT, `HttpOnly; SameSite=Lax;
  Secure`): the app keeps no token, Apollo sends the cookie (`credentials: 'include'`).
- **Sign-up**: username (3 to 32 characters among `a-z 0-9 . _ -`, lowercase), optional e-mail, password (8 to 256
  characters). The account stays **inactive** until an owner activates it in `/admin`.
- **Expired session**: `/graphql` then answers as it does to nobody. On each page change, when a GraphQL request fails,
  when a stream answers `401` or when the tab becomes visible again, the app asks for `viewer` again (`checkSession` in
  `apollo/client.js`, at most every 5 s); with no user, `SessionGate` redirects to sign-in. Deactivating a user ends their
  sessions on the next request. `hooks/useViewer.js` provides `viewer`, `user`, `owner`, `signIn`, `signUp`, `signOut`.
- **Dates**: the API sends RFC 3339 `DateTime`s in UTC (`2024-05-01T12:34:56Z`), read by `parseDateTime` / `formatDate`
  (`utils/format.js`). `releasedOn` is a day at midnight UTC: shown in UTC (`formatDay`), edited as `2024-05-01` and sent
  back as `2024-05-01T00:00:00Z` (`dayOf` / `dateTimeOfDay`).
- Server side: the built-in `admin` account takes the password `OPENPLEX_ADMIN_PASSWORD` (otherwise, when it is created,
  the server generates one and prints it once on its standard output); `OPENPLEX_SESSION_SECRET` (at least 32 bytes)
  keeps sessions valid across restarts; `OPENPLEX_INSECURE_COOKIES=1` drops `Secure` for a server served over plain HTTP
  elsewhere than on localhost.
- **`/settings/account`**: who is signed in (username, e-mail, role), their libraries, sign-out.
- **`/settings/plex`**: users pair their server with their plex.tv account themselves (code from plex.tv/claim +
  address), change the address or unpair.
- **`/settings/jellyfin`**: users expose their libraries to Jellyfin apps themselves (`components/JellyfinSettings`):
  **Enable Jellyfin** (`connectExtension(JELLYFIN)` on their own account), the server address to type in the app
  (`<origin>/jellyfin`, with a copy button; the Vite dev server forwards `/jellyfin` too), the username and password to
  sign in with, the apps signed in (`UserExtension.devices`) each with **Sign out** (`forgetExtensionDevice`), and
  **Disable Jellyfin**, which signs every app out. Without a password, the page says so and points to the account
  settings. Plex stays enabled by an owner only.
- **Password** (`/settings/account`, `components/PasswordSettings`): set one, or change it with the current one
  (`setPassword`). In `/admin`, an owner sets or resets a user's password (`components/UserPasswordDialog`, with a
  generator): what a user created without one needs to sign in here and in Jellyfin apps. Each user card also shows
  and switches Jellyfin access.
- **`/settings/preferences`**: interface language.
- **`/admin`** (`OWNER` role): the libraries (see *Managing libraries*); create a user (username, optional e-mail), activate / deactivate them (pending ones first),
  delete them, grant or remove the owner role, their access to each library (none, reader, admin, or all at once),
  enable Plex (issues the token, shown only once), new token, disable. The server's refusals (`userErrors`) are shown. The
  built-in `admin` account (`builtIn`) is marked as such: demoting, deactivating or deleting it is offered disabled.
  At the top, **Now playing** (`components/NowPlaying`): the active playback sessions (`playbackSessions`, every session
  on the server for an owner), asked again every 5 s while the tab is visible: title, player, state and position (which
  moves between two polls), and for video and audio the source → direct play, direct stream or transcode (output
  resolution and bitrate).

The account menu, at the top right, leads to settings, administration (owner), sign-out and the language choice.

## Managing libraries

- **`/admin` › Libraries** (owners): every library with its type, metadata language and folders, a *Scanning…* badge
  while it is scanned; **Add library**, **Edit** and delete (`components/LibraryEditor`, `components/LibraryDeleteDialog`).
- **Creating** (`createLibrary`, owners only): name, type (movies or shows), metadata language (a BCP 47 tag such as
  `fr-FR`, suggested from the interface language) and one or more folders, as absolute paths **on the server**. The
  server resolves each one and refuses a path it cannot reach (`ROOT_NOT_FOUND`) or a folder inside another
  (`OVERLAPPING_ROOTS`); the error is shown under the folder at fault. The new library is scanned at once.
- **Editing** (`updateLibrary`): a pencil next to the library's title on its page, for the library's **ADMIN** users and
  the owners (`hooks/useCanEdit.js`). Admins change the name and the language; the folders are shown read-only to them,
  and only owners change them (`OWNER_ONLY` otherwise). New folders start a scan, and the files of a folder removed
  leave the library. Folders cannot change while the library is being scanned (`SCANNING`). Only changed fields are sent.
- **Scanning** (`scanLibrary`, `cancelLibraryScan`): **Scan files** next to the library's title and on each row of
  `/admin`, for its admins and the owners (`components/ScanButton`, `hooks/useLibraryScan.js`). The server finds new,
  changed and removed files and has `klapz-scanner` analyse the new ones; while it runs the button stops it, and its
  state is asked again every 2 s. When it ends, every query on screen is fetched again, so new items appear without a
  reload.
  When the last scan stopped before its end — the scanner's ffmpeg has no ffprobe of its own, say — the button says why
  (`Library.scanFailure`, for the library's admins).
- **Deleting** (`deleteLibrary`, owners only): a confirmation, then the library, its items, collections and access
  rights are removed and its playbacks stop; files stay on disk. The library leaves the Apollo cache, the lists of
  libraries are refetched, and its page sends back home.

## Editing movies, shows and episodes

- **Edit** button on a movie's or a show's page, a pencil on each episode (`components/ItemEditor`).
  Shown to the server's owners and to the library's **ADMIN** users (`hooks/useCanEdit.js`, from `viewer`). The server
  has the last word: it refuses what the caller cannot change.
- Fields depend on the type, as the API's inputs do: title, sort title, original title, tagline (movie, show), summary,
  studio (movie, show), content rating, date, year, critic rating (movie), audience rating.
- **Locks**: each field has its padlock (the mutation's `lock` / `unlock`); editing a field locks it, as in Plex Web,
  unless it is unlocked by hand. A cleared field is erased. Only changed fields are sent; nothing changed, nothing sent.
  The sort title follows a new title unless it is locked.
- Mutations return the whole item: the Apollo cache updates the page without reloading, and the URL follows the new slug.

## Full library listing

- **Virtual grid** (`components/VirtualPosterGrid`): the page has the height of the whole listing from the start (from
  `stats.itemCount`), but only the rows on screen, plus two of margin, exist in the DOM — so only their posters load.
  Columns follow `--poster-w` and `--card-gap`, like the regular grid.
- **Pages by position** (`hooks/useOffsetPages.js`): the listing is read in pages of 60 with `items(offset:)`, for the
  visible rows plus one, and only once scrolling stops (160 ms at rest): nothing is requested during a continuous scroll,
  and a long jump loads only the page it lands on. A page still loading when the view leaves it is cancelled (HTTP
  request aborted). Pages arriving together are shown in a single render, and cards already shown do not re-render
  (`PosterCard` is memoized). Each page is a watched query, so an item marked watched updates; pages loaded far from the
  view stop being watched.
- **A–Z bar** (`components/JumpBar`), only when sorted by title, ascending or descending (reversed bar): from
  `stats.firstCharacters`, `#` then A–Z, the other letters (Œ, Greek, Cyrillic…) grouped under `…`. A click glides to
  the letter's first row (420 ms; from far away only the last screen and a half is animated, and nothing is loaded on the
  way; a wheel, a touch or a key stops it; instant with `prefers-reduced-motion`). The current letter is highlighted, and
  on touch screens a finger slides along the bar.
- **Back**: the position is kept per history entry (`utils/scrollMemory.js`); coming back from a movie finds the same
  place in the listing.

## Translations (i18next)

Keys are the English text itself, as flat keys (no `.` or `:` separator):

```jsx
const { t } = useTranslation();
t('Recently added in {{library}}', { library: lib.title });
t('{{count}} season', { count });          // plural → keys _one / _other
<Trans i18nKey="Results for <q>“{{query}}”</q>" values={{ query }} components={{ q: <span /> }} />
```

Outside components (utils), use `i18n.t(...)` from `src/i18n`.

```bash
npm run i18n:extract   # scans t() / <Trans> → src/locales/{en,fr}/translation.json
npm run i18n:status    # keys missing in French
npm run i18n:lint      # inconsistent interpolations, etc.
```

- `en` is generated (key = value); only the `_other` plural forms are filled in by hand.
- A key missing from `fr` is not added empty: the UI falls back to English, and `i18n:status` reports it.
- Keys no longer used in the code are removed on extraction; existing translations are kept.
- Extractor config: `i18next.config.js`. The language is detected from `localStorage`, then the browser, and can be
  changed in the top bar.

## Tests and continuous integration

```bash
npm test               # Vitest, once (npm run test:watch to rerun on every change)
```

The tests (`src/**/*.test.js`, jsdom environment) cover the pure functions: URLs (`safeNext` included), formatting,
playback decisions, the letter bar's offsets, and the completeness of the French translation.

`.github/workflows/ci.yml`, on every push and pull request:

1. **Tests**: `npm ci` then `npm test`.
2. **Build**: `npm run build`, then `dist/` zipped as `klapz-web-<version>.zip`, attached to the run's artifacts.
3. **Release**, on the default branch only: a GitHub release `v<version>` with the zip and notes generated from the
   commits.

Versions are `vX.Y.Z` tags. Each push to the default branch releases the last tag with its patch number raised
(`v0.1.4` → `v0.1.5`); the first release takes `package.json`'s version. Running the workflow by hand
(*Actions → CI → Run workflow*) raises the minor or the major instead. Elsewhere, the zip carries a development version
(`0.1.5-dev.g1a2b3c4`) and nothing is published. The version is written into `package.json` at build time only: nothing
is committed back.

## Structure

```
src/
  apollo/        Apollo client (possibleTypes, relay pagination)
  graphql/       fragments, queries, mutations
  components/    one folder per component: Component.jsx + Component.module.css
  pages/         one folder per page (Home, Library, Movie, Show, Search, NotFound)
  hooks/         useInView, useWatchToggle, usePageTitle
  utils/         formatting, routes, artwork, player
scripts/
  validate-queries.mjs   validates every query against the live schema
  run-query.mjs          runs a named query
```

```bash
node scripts/validate-queries.mjs
```
