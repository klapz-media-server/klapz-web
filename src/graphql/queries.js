import { gql } from '@apollo/client';
import { CARD_FIELDS, EDITABLE_EPISODE, EDITABLE_MOVIE, EDITABLE_SHOW, PEOPLE_FIELDS, TAG_FIELDS, VERSION_FIELDS } from './fragments.js';

export const LIBRARIES = gql`
  query Libraries {
    server {
      id
      friendlyName
      machineIdentifier
    }
    libraries(first: 100) {
      nodes {
        id
        kind
        title
        hidden
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
            }
            show {
              id
              slug
              guid
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
        }
        show {
          id
          slug
          title
          guid
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

/** Operator only: answers "not found" to anyone else. */
export const ADMIN_USERS = gql`
  query AdminUsers {
    users(first: 500) {
      nodes {
        id
        email
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
          }
        }
      }
    }
    libraries(first: 500) {
      nodes {
        id
        title
        kind
      }
    }
  }
`;

/** Who the app is signed in as: the operator, a user, or no one. */
export const VIEWER = gql`
  query Viewer {
    viewer {
      isOperator
      user {
        id
        email
        active
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

/** Whether the server edits items at all: older ones have no `updateMovie`. */
export const EDIT_SUPPORT = gql`
  query EditSupport {
    __type(name: "UpdateMovieInput") {
      name
    }
  }
`;
