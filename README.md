# Klapz — client web

Client web (React 19 + Vite 8 + Apollo Client 4) pour le media server **Klapz**, dans l'esprit de watch.plex.tv / Plex Web : barre de navigation en pastilles, tags de genres, sliders horizontaux, pages film et série avec backdrop.

## Démarrage

```bash
npm install
npm run dev        # http://localhost:5180
```

Le serveur de dev proxifie `/graphql` vers `http://127.0.0.1:32500` (variable `API_URL` pour changer).

## URL

Toutes les URL sont construites dans `src/utils/routes.js`. Un élément a l'URL `/<type>/<id>/<slug>`, l'id tel quel (`=` compris) :

- `/movie/SXRlbTo1NzY5NDc=/les-croods`
- `/show/SXRlbTo1NzcxOTQ=/solo-leveling`, une saison : `/show/<id>/solo-leveling/<idSaison>/solo-leveling-s02`
- `/play/<id>/<slug>` (`?t=<ms>` pour reprendre)

Le slug vient de l'API. C'est un nom, pas une identité : les pages chargent par id, et `useCanonicalPath` réécrit l'adresse
(sans nouvelle entrée d'historique) quand le slug manque ou ne correspond plus, ce qui garde valides les anciens liens
`/movie/<id>` et `/show/<id>?season=<id>`. Dans les query strings aussi, le `=` des ids reste lisible (`?tag=VGFnOjEyMg==`).

## Affiches et backdrops

L'API GraphQL n'expose pas encore d'images. Le plugin Vite `server/artworkPlugin.js` sert `/artwork?guid=plex://…&type=poster|background|logo|thumb` :
il résout le guid via le provider de métadonnées Plex, puis redirige vers le redimensionneur `images.plex.tv`.
Le token plex.tv reste côté serveur : il vient de `PLEX_TOKEN` (`.env.local`), sinon de la clé de registre du Plex Media Server local sous Windows.
Sans token, ou pour les éléments `local://`, l'UI affiche un placeholder généré.

## Lecteur (Shaka Player)

« Lire » ouvre `/play/:id`, un lecteur plein écran sur Shaka Player 5 avec une interface maison (pas l'UI Shaka) :
barre haute (retour, titre), barre de progression avec survol et glisser, ±10 s / +30 s, volume, panneau audio et sous-titres,
qualité (Auto/ABR ou forcée), vitesse, infos de lecture, image dans l'image, plein écran, masquage automatique après 3 s.
Un clic sur l'image met en pause / relance, un double-clic passe en plein écran.

### Lecture réelle (`startStream`)

`components/StreamPlayer` lit le premier fichier de l'élément :

- **Décision côté client** (`utils/capabilities.js`) : `directPlay` si le navigateur lit le conteneur et les codecs tels quels
  (MP4/WebM, piste audio par défaut, sans sous-titres) ; sinon DASH, avec `convertAudio` si l'audio n'est pas décodable
  (AC3, DTS…). Un Direct Play refusé par le navigateur bascule automatiquement en Direct Stream.
- **Adaptatif côté client** (`quality: CLIENT_ADAPTIVE`) : par défaut dès que le fichier ne se lit pas tel quel, et pour une
  vidéo que le navigateur ne décode pas (HEVC…). Le manifeste liste la copie de la vidéo, avec son vrai codec, puis chaque
  encodage ; Shaka choisit selon le débit et écarte de lui-même une copie qu'il ne peut pas décoder. Le serveur n'adapte rien.
- **Pistes et qualité** viennent du fichier (GraphQL) : audio, sous-titres (texte → ASS servi à côté du flux, image → incrustés),
  qualité *Originale* (Direct Play, ou vidéo copiée), *Auto* ou plafond de débit (`maxVideoBitrate`). En *Auto*, le menu liste
  sous « Auto (actuellement 720p) » les qualités du manifeste : en choisir une la fixe dans le lecteur, sans relancer le flux, et
  « Auto » rend la main à l'ABR. Les autres changements relancent le flux à la position courante ; l'ancien est arrêté
  (`stopStream`).
- **Suivi** : `reportPlayback` (prolonge la session, qui expire après 5 min) et `reportViewing` (position de reprise, vu/non vu)
  toutes les 10 s et à chaque lecture / pause ; en sortie (y compris fermeture d'onglet, via `fetch keepalive`) :
  dernière position, `STOPPED`, `stopStream`.
- **Reprise** : `/play/:id?t=<ms>` ; « Reprendre » et les épisodes en cours y passent leur position. Une série lit son premier épisode non vu.
- Le badge et l'onglet *Infos* affichent la décision du serveur (`delivery`, `videoDecision`, `audioDecision`).
  L'API ne donne pas encore la vitesse de transcodage (`decisionFromStream` lira `transcodeSpeed` quand il existera).
- Le proxy Vite transmet `/streams` (manifestes, segments, fichiers, sous-titres) au serveur.

### Flux de test

`?src=sintel|angel-one|bbb|<url d'un .mpd>` (ou `VITE_TEST_MPD`) joue un manifeste de test à la place
(`src/utils/streams.js`), avec la décision simulée `?decision=play|stream|transcode|slow&speed=2.3`.

Raccourcis : `Espace`/`k` lecture-pause, `←` −10 s, `→`/`l` +30 s, `↑`/`↓` volume, `m` muet, `c` sous-titres, `f` plein écran, `p` image dans l'image, `i` infos de lecture.

Code : `hooks/useStreamSession.js` (startStream / stopStream), `hooks/useServerTrackOptions.js`, `hooks/useShakaPlayer.js` (instance Shaka), `hooks/useMediaState.js` (état de la vidéo),
`components/StreamPlayer` (lecture réelle), `components/VideoPlayer` (interface) + `SeekBar`, `VolumeControl`, `PlayerSettings`, `PlaybackInfo`, `StreamBadge`, `PlayerIconButton`, `PlayerFeedback`.

## Compte, réglages et administration

- **Tout passe par la connexion** (`components/SessionGate`) : sans session, l'app ne montre que `/sign-in` et
  `/sign-up` ; toute autre adresse renvoie vers `/sign-in?next=…`, puis revient à la page demandée. `next` n'est suivi
  que s'il désigne une page de l'app (`safeNext` dans `utils/routes.js` : ni `//ailleurs`, ni `https://…`, ni les pages
  de connexion elles-mêmes). Il n'y a ni mode anonyme ni réseau de confiance : chaque requête est celle d'un utilisateur.
- **Connexion** (`pages/AuthPage`) : nom d'utilisateur **ou** e-mail, et mot de passe. Les refus `INVALID_CREDENTIALS`
  (même réponse pour un compte inconnu et un mauvais mot de passe), `INACTIVE` et `TOO_MANY_ATTEMPTS` (cinq échecs en
  quinze minutes) ont chacun leur message. Le serveur répond par un cookie de session (JWT, `HttpOnly; SameSite=Lax;
  Secure`) : l'app n'a aucun token à garder, Apollo envoie le cookie (`credentials: 'same-origin'`, d'où le proxy Vite
  sur la même origine).
- **Inscription** : nom d'utilisateur (3 à 32 caractères parmi `a-z 0-9 . _ -`, en minuscules), e-mail facultatif,
  mot de passe (8 à 256 caractères). Le compte reste **inactif** jusqu'à ce qu'un propriétaire l'active dans `/admin`.
- **Session expirée** : `/graphql` répond alors comme à personne. À chaque changement de page, quand une requête GraphQL échoue, qu'un flux répond
  `401` ou que l'onglet redevient visible, l'app redemande `viewer` (`checkSession` dans `apollo/client.js`, au plus
  toutes les 5 s) ; sans utilisateur, `SessionGate` renvoie vers la connexion. Désactiver un utilisateur coupe ses
  sessions à la requête suivante. `hooks/useViewer.js` porte `viewer`, `user`, `owner`, `signIn`, `signUp`, `signOut`.
- **Dates** : l'API envoie des `DateTime` RFC 3339 en UTC (`2024-05-01T12:34:56Z`), lus par `parseDateTime` /
  `formatDate` (`utils/format.js`). `releasedOn` est un jour à minuit UTC : affiché en UTC (`formatDay`), édité comme
  `2024-05-01` et renvoyé en `2024-05-01T00:00:00Z` (`dayOf` / `dateTimeOfDay`).
- Côté serveur : le compte intégré `admin` prend le mot de passe `OPENPLEX_ADMIN_PASSWORD` (sinon, à sa création, le serveur en tire un
  et l'affiche une fois sur sa sortie standard) ; `OPENPLEX_SESSION_SECRET` (32 octets au moins) garde les sessions valides d'un redémarrage à l'autre ;
  `OPENPLEX_INSECURE_COOKIES=1` retire `Secure` pour un serveur servi en HTTP simple ailleurs qu'en localhost.
- **`/settings/account`** : qui est connecté (nom d'utilisateur, e-mail, rôle), ses bibliothèques, déconnexion.
- **`/settings/plex`** : l'utilisateur appaire lui-même son serveur à son compte plex.tv (code de plex.tv/claim + adresse),
  change l'adresse ou dissocie.
- **`/settings/preferences`** : langue de l'interface.
- **`/admin`** (rôle `OWNER`) : créer un utilisateur (nom d'utilisateur, e-mail facultatif), l'activer / le désactiver
  (ceux en attente en tête), le supprimer, lui donner ou retirer le rôle de propriétaire, son accès à chaque bibliothèque
  (aucun, lecteur, admin, ou tout d'un coup), activer Plex (émet le token, affiché une seule fois), nouveau token,
  désactiver. Les refus du serveur (`userErrors`) sont affichés. Le compte intégré `admin` (`builtIn`) est marqué comme
  tel : le rétrograder, le désactiver ou le supprimer est proposé désactivé.
  En tête, **En cours de lecture** (`components/NowPlaying`) : les sessions de lecture actives (`playbackSessions`,
  toutes celles du serveur pour un propriétaire), redemandées toutes les 5 s quand l'onglet est visible : titre, lecteur,
  état et position (qui avance entre deux relevés), et pour la vidéo et l'audio la source → lecture directe, flux en direct
  ou transcodage (résolution et débit de sortie).

Le menu du compte, en haut à droite, mène aux réglages, à l'administration (propriétaire), à la déconnexion et au choix de la langue.

## Édition des films, séries et épisodes

- Bouton **Modifier** sur la page d'un film ou d'une série, crayon sur chaque épisode (`components/ItemEditor`).
  Affiché aux propriétaires du serveur et aux utilisateurs **ADMIN** de la bibliothèque (`hooks/useCanEdit.js`, d'après
  `viewer`). Le serveur reste juge : il refuse ce que l'appelant ne peut pas modifier.
- Champs selon le type, comme les entrées de l'API : titre, titre de tri, titre original, accroche (film, série),
  résumé, studio (film, série), classification, date, année, note des critiques (film), note du public.
- **Verrous** : chaque champ a son cadenas (`lock` / `unlock` de la mutation) ; modifier un champ le verrouille, comme
  Plex Web, sauf à le déverrouiller à la main. Un champ vidé est effacé. Seuls les champs changés sont envoyés ; rien de
  changé, rien d'envoyé. Le titre de tri suit un nouveau titre s'il n'est pas verrouillé.
- Les mutations renvoient l'élément entier : le cache Apollo met la page à jour sans recharger, et l'URL suit le
  nouveau slug.

## Liste complète d'une bibliothèque

- **Grille virtuelle** (`components/VirtualPosterGrid`) : la page a d'emblée la hauteur de toute la liste (d'après
  `stats.itemCount`), mais seules les rangées à l'écran, plus deux de marge, existent dans le DOM — et donc seules leurs
  affiches se chargent. Les colonnes suivent `--poster-w` et `--card-gap`, comme la grille ordinaire.
- **Pages à la position** (`hooks/useOffsetPages.js`) : la liste est lue par pages de 60 avec `items(offset:)`, pour les
  rangées visibles plus une, et seulement quand le défilement s'arrête (160 ms de repos) : rien n'est demandé pendant un
  défilement continu, un grand saut ne charge que la page d'arrivée. Une page encore en route quand la vue la quitte est
  annulée (requête HTTP interrompue). Les pages qui arrivent ensemble sont affichées en un seul rendu, et les cartes déjà
  affichées ne se re-rendent pas (`PosterCard` mémoïsé). Chaque page est une requête observée, donc un élément marqué vu
  se met à jour ; les pages chargées loin de la vue cessent d'être suivies.
- **Barre A–Z** (`components/JumpBar`), seulement en tri par titre, croissant ou décroissant (barre inversée) : d'après
  `stats.firstCharacters`, `#` puis A–Z, les autres lettres (Œ, grec, cyrillique…) réunies sous `…`. Un clic glisse
  jusqu'à la première rangée de la lettre (420 ms ; de loin, seul le dernier écran et demi est animé, et rien n'est
  chargé en route ; molette, toucher ou clavier l'arrêtent ; immédiat avec `prefers-reduced-motion`). La lettre en cours
  est surlignée, et au doigt on glisse le long de la barre.
- **Retour** : la position est retenue par entrée d'historique (`utils/scrollMemory.js`) ; revenir d'un film retrouve
  l'endroit de la liste.

## Traductions (i18next)

Les clés sont le texte anglais lui-même, en clés plates (pas de séparateur `.` ni `:`) :

```jsx
const { t } = useTranslation();
t('Recently added in {{library}}', { library: lib.title });
t('{{count}} season', { count });          // pluriel → clés _one / _other
<Trans i18nKey="Results for <q>“{{query}}”</q>" values={{ query }} components={{ q: <span /> }} />
```

Hors composant (utils), utiliser `i18n.t(...)` depuis `src/i18n`.

```bash
npm run i18n:extract   # scanne t() / <Trans> → src/locales/{en,fr}/translation.json
npm run i18n:status    # clés manquantes en français
npm run i18n:lint      # interpolations incohérentes, etc.
```

- `en` est généré (clé = valeur) ; seules les formes `_other` des pluriels sont à compléter à la main.
- Une clé absente de `fr` n'y est pas ajoutée vide : l'UI retombe sur l'anglais, et `i18n:status` la signale.
- Les clés qui ne sont plus utilisées dans le code sont supprimées à l'extraction ; les traductions existantes sont conservées.
- Config de l'extracteur : `i18next.config.js`. Langue détectée via `localStorage` puis le navigateur, changeable dans la barre du haut.

## Tests et intégration continue

```bash
npm test               # Vitest, une fois (npm run test:watch pour relancer à chaque modification)
```

Les tests (`src/**/*.test.js`, environnement jsdom) couvrent les fonctions pures : URLs (`safeNext` compris),
formats, décision de lecture, décalages de la barre de lettres, et la complétude de la traduction française.

`.github/workflows/ci.yml`, à chaque push et pull request :

1. **Tests** : `npm ci` puis `npm test`.
2. **Build** : `npm run build`, puis `dist/` zippé en `klapz-web-<version>.zip`, joint aux artefacts du run.
3. **Release**, sur la branche par défaut seulement : une release GitHub `v<version>` avec le zip et les notes
   générées depuis les commits.

Les versions sont les tags `vX.Y.Z`. Chaque push sur la branche par défaut publie le dernier tag avec le patch
augmenté (`v0.1.4` → `v0.1.5`) ; la première release prend la version de `package.json`. Lancer le workflow à la main
(*Actions → CI → Run workflow*) permet d'augmenter le mineur ou le majeur. Ailleurs, le zip porte une version de
développement (`0.1.5-dev.g1a2b3c4`) et rien n'est publié. La version est écrite dans `package.json` au moment du
build seulement : rien n'est recommité.

## Structure

```
src/
  apollo/        client Apollo (possibleTypes, pagination relay)
  graphql/       fragments, requêtes, mutations
  components/    un dossier par composant : Composant.jsx + Composant.module.css
  pages/         un dossier par page (Home, Library, Movie, Show, Search, NotFound)
  hooks/         useInView, useWatchToggle, usePageTitle
  utils/         formatage, routes, artwork, lecteur
scripts/
  validate-queries.mjs   valide toutes les requêtes contre le schéma live
  run-query.mjs          exécute une requête nommée
```

```bash
node scripts/validate-queries.mjs
```
