import { gql } from '@apollo/client';
import { CARD_FIELDS, EDITABLE_EPISODE, EDITABLE_MOVIE, EDITABLE_SHOW, PEOPLE_FIELDS, TAG_FIELDS, VERSION_FIELDS } from './fragments.js';

export const LIBRARIES = gql`
  query Libraries {
    libraries(first: 100) {
      nodes {
        id
        kind
        title
        hidden
        scanning
        stats {
          itemCount
        }
      }
    }
  }
`;

export const CONTINUE_WATCHING = gql`
  ${CARD_FIELDS}
  query ContinueWatching($library: ID, $first: Int = 20) {
    continueWatching(library: $library, first: $first) {
      edges {
        reason
        lastViewedAt
        node {
          ...CardFields
        }
      }
    }
  }
`;

export const RECENTLY_ADDED = gql`
  ${CARD_FIELDS}
  query RecentlyAdded($id: ID!, $first: Int = 24) {
    node(id: $id) {
      id
      ... on Library {
        recentlyAdded(first: $first) {
          nodes {
            ...CardFields
          }
        }
      }
    }
  }
`;

export const LIBRARY_ITEMS = gql`
  ${CARD_FIELDS}
  query LibraryItems(
    $id: ID!
    $first: Int = 48
    $after: String
    $filter: ItemFilterInput
    $orderBy: ItemOrder
    $direction: SortDirection
    $seed: Int
  ) {
    node(id: $id) {
      id
      ... on Library {
        items(
          first: $first
          after: $after
          filter: $filter
          orderBy: $orderBy
          direction: $direction
          seed: $seed
        ) {
          pageInfo {
            hasNextPage
            endCursor
          }
          edges {
            cursor
            node {
              ...CardFields
            }
          }
        }
        stats(filter: $filter) {
          itemCount
        }
      }
    }
  }
`;

export const LIBRARY_INFO = gql`
  ${TAG_FIELDS}
  query LibraryInfo($id: ID!) {
    node(id: $id) {
      id
      ... on Library {
        title
        kind
        stats {
          itemCount
        }
        roots {
          id
          path
        }
        genres: tags(kind: GENRE, first: 60) {
          nodes {
            ...TagFields
          }
        }
      }
    }
  }
`;

export const TAG_NAME = gql`
  ${TAG_FIELDS}
  query TagName($id: ID!) {
    node(id: $id) {
      id
      ... on Tag {
        ...TagFields
        person {
          id
          thumbUrl
        }
      }
    }
  }
`;

export const SPOTLIGHT = gql`
  query Spotlight($id: ID!, $seed: Int) {
    node(id: $id) {
      id
      ... on Library {
        items(
          first: 6
          orderBy: RANDOM
          seed: $seed
          filter: { audienceRatingFrom: 7.2, yearFrom: 2005 }
        ) {
          nodes {
            id
            title
            guid
            images {
              kind
              url
              blurHash
            }
            summary
            ... on Movie {
              slug
              year
              durationMs
              contentRating
              tagline
              audienceRating
              tags {
                genres(first: 3) {
                  nodes {
                    id
                    name
                  }
                }
              }
            }
            ... on Show {
              slug
              year
              contentRating
              audienceRating
              stats {
                seasonCount
              }
              tags(includeEpisodes: false) {
                genres(first: 3) {
                  nodes {
                    id
                    name
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

export const MOVIE = gql`
  ${CARD_FIELDS}
  ${PEOPLE_FIELDS}
  ${VERSION_FIELDS}
  query Movie($id: ID!) {
    node(id: $id) {
      id
      ... on Movie {
        title
        slug
        originalTitle
        guid
        images {
          kind
          url
          blurHash
        }
        summary
        tagline
        year
        releasedOn
        studio
        contentRating
        rating
        audienceRating
        durationMs
        addedAt
        library {
          id
          title
          kind
        }
        watchState {
          isWatched
          offsetMs
          viewCount
          lastViewedAt
        }
        ratings {
          nodes {
            source
            kind
            value
          }
        }
        tags {
          ...PeopleFields
        }
        versions {
          ...VersionFields
        }
        similar(first: 20) {
          nodes {
            ...CardFields
          }
        }
      }
    }
  }
`;

export const SHOW = gql`
  ${CARD_FIELDS}
  ${PEOPLE_FIELDS}
  query Show($id: ID!) {
    node(id: $id) {
      id
      ... on Show {
        title
        slug
        originalTitle
        guid
        images {
          kind
          url
          blurHash
        }
        summary
        tagline
        year
        releasedOn
        studio
        contentRating
        audienceRating
        durationMs
        library {
          id
          title
          kind
        }
        watchState {
          isWatched
          offsetMs
          viewCount
        }
        stats {
          seasonCount
          episodeCount
          watchedEpisodeCount
        }
        ratings {
          nodes {
            source
            kind
            value
          }
        }
        tags(includeEpisodes: false) {
          ...PeopleFields
        }
        seasons(first: 100) {
          nodes {
            id
            title
            slug
            guid
            images {
              kind
              url
              blurHash
            }
            number
            year
            watchState {
              isWatched
            }
            stats {
              episodeCount
              watchedEpisodeCount
            }
          }
        }
        similar(first: 20) {
          nodes {
            ...CardFields
          }
        }
      }
    }
  }
`;

export const SEASON_EPISODES = gql`
  query SeasonEpisodes($id: ID!) {
    node(id: $id) {
      id
      ... on Season {
        number
        summary
        episodes(first: 200) {
          nodes {
            id
            title
            slug
            guid
            images {
              kind
              url
              blurHash
            }
            number
            summary
            durationMs
            releasedOn
            contentRating
            watchState {
              isWatched
              offsetMs
              viewCount
            }
            season {
              id
              slug
              number
              guid
              images {
                kind
                url
                blurHash
              }
            }
            show {
              id
              slug
              guid
              images {
                kind
                url
                blurHash
              }
            }
          }
        }
      }
    }
  }
`;

export const PLAYER_ITEM = gql`
  fragment PlayerVersion on MediaVersion {
    id
    container
    videoCodec
    audioCodec
    audioChannels
    width
    height
    bitrate
    durationMs
    files {
      id
      sizeBytes
      streams {
        id
        kind
        codec
        language
        title
        channels
        isDefault
        isForced
        isExternal
      }
    }
  }

  query PlayerItem($id: ID!) {
    node(id: $id) {
      id
      ... on Movie {
        title
        slug
        guid
        images {
          kind
          url
          blurHash
        }
        year
        durationMs
        watchState {
          isWatched
          offsetMs
        }
        versions {
          ...PlayerVersion
        }
      }
      ... on Show {
        title
        slug
        guid
        images {
          kind
          url
          blurHash
        }
        year
        episodes(first: 500) {
          nodes {
            id
            slug
            watchState {
              isWatched
              offsetMs
            }
          }
        }
      }
      ... on Episode {
        title
        slug
        guid
        images {
          kind
          url
          blurHash
        }
        number
        durationMs
        watchState {
          isWatched
          offsetMs
        }
        versions {
          ...PlayerVersion
        }
        season {
          id
          number
          guid
          images {
            kind
            url
            blurHash
          }
        }
        show {
          id
          slug
          title
          guid
          images {
            kind
            url
            blurHash
          }
        }
      }
    }
  }
`;

export const SEARCH = gql`
  ${CARD_FIELDS}
  query Search($query: String!, $kinds: [ItemType!], $first: Int = 40) {
    search(query: $query, kinds: $kinds, first: $first) {
      edges {
        node {
          ...CardFields
          library {
            id
            title
          }
        }
      }
    }
  }
`;

/** Owners only: anyone else is answered as if there were no users. */
export const ADMIN_USERS = gql`
  query AdminUsers {
    users(first: 500) {
      nodes {
        id
        username
        email
        role
        builtIn
        active
        hasPassword
        createdAt
        libraryPermissions {
          nodes {
            role
            library {
              id
            }
          }
        }
        extensions {
          nodes {
            extension
            externalId
            enabled
            account {
              accountName
              connectionUri
              publishedAt
            }
            devices {
              deviceId
            }
          }
        }
      }
    }
    libraries(first: 500) {
      nodes {
        id
        title
        kind
        language
        scanning
        roots {
          id
          path
        }
      }
    }
  }
`;

/** A library as its editor opens it, fetched fresh: its roots may have changed elsewhere. */
export const LIBRARY_SETTINGS = gql`
  query LibrarySettings($id: ID!) {
    node(id: $id) {
      id
      ... on Library {
        title
        kind
        language
        scanning
        roots {
          id
          path
        }
      }
    }
  }
`;

/** What `LibrarySettingsDialog` shows of a library's setting, so a change's answer replaces it. */
export const LIBRARY_SETTING_FIELDS = `
  key
  description
  kind
  value
  isInherited
  serverValue
  updatedAt
  updatedBy {
    id
    username
  }
`;

/** What `LibrarySettingsDialog` shows of a library: its settings in one namespace, and how far its files are read. */
export const LIBRARY_ANALYSIS_FIELDS = `
  id
  title
  settings(namespace: $namespace) {
    nodes {
      ${LIBRARY_SETTING_FIELDS}
    }
  }
  analysis {
    fileCount
    readFileCount
    completeFileCount
    reading
    failure
  }
`;

/** The settings a library holds in one namespace (`analysis`…), for the server's owners. */
export const LIBRARY_ANALYSIS_SETTINGS = gql`
  query LibraryAnalysisSettings($id: ID!, $namespace: String) {
    node(id: $id) {
      id
      ... on Library {
        ${LIBRARY_ANALYSIS_FIELDS}
      }
    }
  }
`;

/** Who the app is signed in as: a user, or no one (`role` and `user` null). */
export const VIEWER = gql`
  query Viewer {
    viewer {
      role
      user {
        id
        username
        email
        role
        builtIn
        active
        hasPassword
        createdAt
        libraryPermissions {
          nodes {
            role
            library {
              id
              title
            }
          }
        }
        extensions {
          nodes {
            extension
            externalId
            enabled
            account {
              accountName
              connectionUri
              publishedAt
            }
            devices {
              deviceId
              deviceName
              client
              clientVersion
              signedInAt
            }
          }
        }
      }
    }
  }
`;

export const ITEM_FOR_EDIT = gql`
  ${EDITABLE_MOVIE}
  ${EDITABLE_SHOW}
  ${EDITABLE_EPISODE}
  query ItemForEdit($id: ID!) {
    node(id: $id) {
      id
      ... on Movie {
        ...EditableMovie
      }
      ... on Show {
        ...EditableShow
      }
      ... on Episode {
        ...EditableEpisode
      }
    }
  }
`;

/** How many items a filtered listing holds, and its first-letter buckets for the jump bar. */
export const LIBRARY_LISTING = gql`
  query LibraryListing($id: ID!, $filter: ItemFilterInput, $letters: Boolean!) {
    node(id: $id) {
      id
      ... on Library {
        stats(filter: $filter) {
          itemCount
          firstCharacters @include(if: $letters) {
            character
            count
          }
        }
      }
    }
  }
`;

/** One page of a listing at an absolute position, for a grid that renders only what is in view. */
export const LIBRARY_PAGE = gql`
  ${CARD_FIELDS}
  query LibraryPage(
    $id: ID!
    $offset: Int!
    $first: Int!
    $filter: ItemFilterInput
    $orderBy: ItemOrder
    $direction: SortDirection
    $seed: Int
  ) {
    node(id: $id) {
      id
      ... on Library {
        items(first: $first, offset: $offset, filter: $filter, orderBy: $orderBy, direction: $direction, seed: $seed) {
          edges {
            cursor
            node {
              ...CardFields
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
  }
`;

/** What is being played right now. An owner sees everyone's sessions. */
export const PLAYBACK_SESSIONS = gql`
  fragment SessionSource on MediaVersion {
    id
    width
    height
    videoCodec
    audioCodec
    audioChannels
  }

  query PlaybackSessions {
    playbackSessions(first: 100) {
      edges {
        node {
          id
          state
          clientProduct
          clientIdentifier
          positionMs
          videoDecision
          audioDecision
          width
          height
          videoBitrate
          audioBitrate
          startedAt
          updatedAt
          item {
            ...CardFields
            ... on Movie {
              versions {
                ...SessionSource
              }
            }
            ... on Episode {
              versions {
                ...SessionSource
              }
            }
          }
        }
      }
    }
  }
  ${CARD_FIELDS}
`;

/** Whether a library is being scanned, and how far its files are read; asked again meanwhile. */
export const LIBRARY_SCAN_STATE = gql`
  query LibraryScanState($id: ID!) {
    node(id: $id) {
      id
      ... on Library {
        scanning
        scannedAt
        scanFailure
        analysis {
          fileCount
          readFileCount
          completeFileCount
          reading
          failure
        }
      }
    }
  }
`;

/**
 * The server's folders, for an owner choosing a library's: without `path`, its drives or `/`;
 * with one, the folders inside it. Owners only. `error` (NOT_FOUND, NOT_A_DIRECTORY,
 * UNREADABLE) says why `listing` is null.
 */
export const SERVER_DIRECTORIES = gql`
  query ServerDirectories($path: String, $first: Int, $after: String) {
    serverDirectories(path: $path) {
      error
      listing {
        path
        parent
        truncated
        directories(first: $first, after: $after) {
          nodes {
            name
            path
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
  }
`;

/** What `ServerSettingsSection` shows of a setting, so a change's answer replaces it. */
export const SERVER_SETTING_FIELDS = `
  key
  description
  kind
  perLibrary
  value
  defaultValue
  isDefault
  optional
  choices
  minimum
  maximum
  updatedAt
  updatedBy {
    id
    username
  }
`;

/** The server's settings in one namespace (`transcoder`…), for its owners. */
export const SERVER_SETTINGS = gql`
  query ServerSettings($namespace: String) {
    server {
      id
      settings(namespace: $namespace) {
        nodes {
          ${SERVER_SETTING_FIELDS}
        }
      }
    }
  }
`;

/**
 * A series' theme music, asked apart from the series' page: a server without `Show.theme`
 * refuses this query alone, and the page plays nothing.
 */
export const SHOW_THEME = gql`
  query ShowTheme($id: ID!) {
    node(id: $id) {
      id
      ... on Show {
        theme {
          url
        }
      }
    }
  }
`;
