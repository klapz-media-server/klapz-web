import { gql } from '@apollo/client';

export const CARD_FIELDS = gql`
  fragment CardFields on Item {
    id
    title
    guid
    watchState {
      isWatched
      offsetMs
      viewCount
    }
    ... on Movie {
      slug
      year
      durationMs
    }
    ... on Show {
      slug
      year
      stats {
        seasonCount
        episodeCount
        watchedEpisodeCount
      }
    }
    ... on Season {
      slug
      number
      show {
        id
        slug
        title
        guid
      }
    }
    ... on Episode {
      slug
      number
      durationMs
      season {
        id
        slug
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
`;

export const TAG_FIELDS = gql`
  fragment TagFields on Tag {
    id
    kind
    name
  }
`;

export const PEOPLE_FIELDS = gql`
  fragment PeopleFields on ItemTags {
    cast(first: 30) {
      edges {
        character
        node {
          id
          name
          kind
          person {
            id
            thumbUrl
          }
        }
      }
    }
    directors(first: 5) {
      nodes {
        id
        name
        kind
        person {
          id
          thumbUrl
        }
      }
    }
    writers(first: 5) {
      nodes {
        id
        name
        kind
        person {
          id
          thumbUrl
        }
      }
    }
    genres(first: 10) {
      nodes {
        id
        name
        kind
      }
    }
    countries(first: 5) {
      nodes {
        id
        name
        kind
      }
    }
  }
`;

export const VERSION_FIELDS = gql`
  fragment VersionFields on MediaVersion {
    id
    width
    height
    videoCodec
    audioCodec
    audioChannels
    bitrate
    container
    frameRate
    files {
      id
      filename
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
        video {
          color {
            transfer
          }
          dolbyVision {
            profile
          }
          hasHdr10Plus
        }
      }
    }
  }
`;

/** What an editor can change on each type, and the fields locked against a metadata refresh. */
export const EDITABLE_MOVIE = gql`
  fragment EditableMovie on Movie {
    id
    title
    slug
    titleSort
    originalTitle
    tagline
    summary
    studio
    contentRating
    releasedOn
    year
    rating
    audienceRating
    lockedFields
  }
`;

export const EDITABLE_SHOW = gql`
  fragment EditableShow on Show {
    id
    title
    slug
    titleSort
    originalTitle
    tagline
    summary
    studio
    contentRating
    releasedOn
    year
    audienceRating
    lockedFields
  }
`;

export const EDITABLE_EPISODE = gql`
  fragment EditableEpisode on Episode {
    id
    title
    slug
    titleSort
    originalTitle
    summary
    contentRating
    releasedOn
    year
    audienceRating
    lockedFields
  }
`;
