# open-web

Client web (React 19 + Vite 8 + Apollo Client 4) pour le media server **open-plex**, dans l'esprit de watch.plex.tv / Plex Web : barre de navigation en pastilles, tags de genres, sliders horizontaux, pages film et série avec backdrop.

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
  (AC3, DTS…) et `adaptive` (ré-encodage) si la vidéo ne l'est pas (HEVC…). Un Direct Play refusé par le navigateur
  bascule automatiquement en Direct Stream.
- **Pistes et qualité** viennent du fichier (GraphQL) : audio, sous-titres (texte → ASS servi à côté du flux, image → incrustés),
  qualité *Originale*, *Auto* (transcodage adaptatif) ou plafond de débit (`maxVideoBitrate`). Chaque changement relance le flux
  à la position courante ; l'ancien est arrêté (`stopStream`).
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

- **Inscription / connexion** (`/sign-up`, `/sign-in`, `pages/AuthPage`) : e-mail + mot de passe (8 à 256 caractères).
  Un compte créé est **inactif** jusqu'à ce que l'opérateur l'active dans `/admin`. Le serveur répond à la connexion
  par un cookie de session (JWT, `HttpOnly; SameSite=Lax; Secure`) : l'app n'a aucun token à garder, Apollo envoie le
  cookie (`credentials: 'same-origin'`, d'où le proxy Vite sur la même origine). Cinq échecs en quinze minutes
  bloquent l'adresse ; une adresse inconnue et un mauvais mot de passe reçoivent la même réponse.
- **Accès** (`components/SessionGate`) : sans session, sur un réseau qui n'est pas de confiance, toute page renvoie
  vers `/sign-in?next=…`, puis revient à la page demandée. Sur un réseau de confiance (`OPENPLEX_ALLOWED_NETWORKS`),
  le serveur admet l'app comme son **opérateur** ; un cookie de session passe avant. Désactiver un utilisateur coupe
  ses sessions à la requête suivante. `hooks/useViewer.js` porte `viewer`, `signIn`, `signUp`, `signOut`.
- Côté serveur : `OPENPLEX_SESSION_SECRET` (32 octets au moins) garde les sessions valides d'un redémarrage à l'autre ;
  `OPENPLEX_INSECURE_COOKIES=1` retire `Secure` pour un serveur servi en HTTP simple ailleurs qu'en localhost.
- **`/settings/account`** : qui est connecté, ses bibliothèques, connexion / déconnexion.
- **`/settings/plex`** : l'utilisateur appaire lui-même son serveur à son compte plex.tv (code de plex.tv/claim + adresse),
  change l'adresse ou dissocie. Demande un open-plex qui expose `viewer` et ouvre `pairExtension` / `moveExtension` /
  `unpairExtension` à l'utilisateur lui-même.
- **`/settings/preferences`** : langue de l'interface.
- **`/admin`** (opérateur) : activer / désactiver les comptes (ceux en attente en tête), ajouter / supprimer des utilisateurs, leur accès à chaque bibliothèque (aucun, lecteur, admin,
  ou tout d'un coup), activer Plex (émet le token, affiché une seule fois), nouveau token, désactiver.

Le menu du compte, en haut à droite, mène aux réglages, à l'administration (opérateur) et au choix de la langue.

## Édition des films, séries et épisodes

- Bouton **Modifier** sur la page d'un film ou d'une série, crayon sur chaque épisode (`components/ItemEditor`).
  Affiché à l'opérateur et aux utilisateurs **ADMIN** de la bibliothèque (`hooks/useCanEdit.js`, d'après `viewer`),
  et seulement si le serveur connaît `updateMovie` (sondé par `__type(name: "UpdateMovieInput")`) : un open-plex plus
  ancien ne montre rien. Le serveur reste juge : il refuse ce que l'appelant ne peut pas modifier.
- Champs selon le type, comme les entrées de l'API : titre, titre de tri, titre original, accroche (film, série),
  résumé, studio (film, série), classification, date, année, note des critiques (film), note du public.
- **Verrous** : chaque champ a son cadenas (`lock` / `unlock` de la mutation) ; modifier un champ le verrouille, comme
  Plex Web, sauf à le déverrouiller à la main. Un champ vidé est effacé. Seuls les champs changés sont envoyés ; rien de
  changé, rien d'envoyé. Le titre de tri suit un nouveau titre s'il n'est pas verrouillé.
- Les mutations renvoient l'élément entier : le cache Apollo met la page à jour sans recharger, et l'URL suit le
  nouveau slug.

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
