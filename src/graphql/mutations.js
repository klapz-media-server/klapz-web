import { gql } from '@apollo/client';
import { EDITABLE_EPISODE, EDITABLE_MOVIE, EDITABLE_SHOW } from './fragments.js';

export const MARK_WATCHED = gql`
  mutation MarkWatched($id: ID!) {
    markWatched(id: $id) {
      isWatched
      offsetMs
      viewCount
      lastViewedAt
    }
  }
`;

export const MARK_UNWATCHED = gql`
  mutation MarkUnwatched($id: ID!) {
    markUnwatched(id: $id) {
      isWatched
      offsetMs
      viewCount
      lastViewedAt
    }
  }
`;

export const START_STREAM = gql`
  mutation StartStream($input: StartStreamInput!) {
    startStream(input: $input) {
      stream {
        delivery
        protocol
        videoDecision
        audioDecision
        url
        subtitlesUrl
        videoBitrate
        audioBitrate
        width
        height
      }
      session {
        id
        key
        playbackId
        expiresAt
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

export const STOP_STREAM = gql`
  mutation StopStream($input: StopStreamInput!) {
    stopStream(input: $input) {
      stopped
    }
  }
`;

export const REPORT_PLAYBACK = gql`
  mutation ReportPlayback($input: ReportPlaybackInput!) {
    reportPlayback(input: $input)
  }
`;

export const REPORT_VIEWING = gql`
  mutation ReportViewing($input: ReportViewingInput!) {
    reportViewing(input: $input) {
      outcome
      state {
        isWatched
        offsetMs
        viewCount
        lastViewedAt
      }
    }
  }
`;

// ---- administration (operator only)

export const CREATE_USER = gql`
  mutation CreateUser($email: String!) {
    createUser(email: $email) {
      id
    }
  }
`;

export const DELETE_USER = gql`
  mutation DeleteUser($id: ID!) {
    deleteUser(id: $id)
  }
`;

export const SET_LIBRARY_PERMISSION = gql`
  mutation SetLibraryPermission($input: SetLibraryPermissionInput!) {
    setLibraryPermission(input: $input)
  }
`;

export const REMOVE_LIBRARY_PERMISSION = gql`
  mutation RemoveLibraryPermission($userId: ID!, $libraryId: ID!) {
    removeLibraryPermission(userId: $userId, libraryId: $libraryId)
  }
`;

export const CONNECT_PLEX = gql`
  mutation ConnectPlex($userId: ID!) {
    connectExtension(userId: $userId, extension: PLEX) {
      token
      userExtension {
        externalId
        enabled
      }
    }
  }
`;

export const DISABLE_PLEX = gql`
  mutation DisablePlex($userId: ID!) {
    disableExtension(userId: $userId, extension: PLEX)
  }
`;

export const PAIR_PLEX = gql`
  mutation PairPlex($input: PairExtensionInput!) {
    pairExtension(input: $input) {
      accountName
      connectionUri
      publishedAt
    }
  }
`;

export const UNPAIR_PLEX = gql`
  mutation UnpairPlex($userId: ID!) {
    unpairExtension(userId: $userId, extension: PLEX)
  }
`;

export const MOVE_PLEX = gql`
  mutation MovePlex($input: MoveExtensionInput!) {
    moveExtension(input: $input) {
      accountName
      connectionUri
      publishedAt
    }
  }
`;

// ---- accounts: open to anyone; the session comes back as an HttpOnly cookie

export const SIGN_UP = gql`
  mutation SignUp($input: SignUpInput!) {
    signUp(input: $input) {
      created
      userErrors {
        field
        code
      }
    }
  }
`;

export const SIGN_IN = gql`
  mutation SignIn($input: SignInInput!) {
    signIn(input: $input) {
      user {
        id
        email
      }
      userErrors {
        field
        code
      }
    }
  }
`;

export const SIGN_OUT = gql`
  mutation SignOut {
    signOut
  }
`;

export const ACTIVATE_USER = gql`
  mutation ActivateUser($id: ID!) {
    activateUser(id: $id) {
      id
      active
    }
  }
`;

export const DEACTIVATE_USER = gql`
  mutation DeactivateUser($id: ID!) {
    deactivateUser(id: $id) {
      id
      active
    }
  }
`;

const EDIT_ERRORS = `
  userErrors {
    field
    code
  }
`;

export const UPDATE_MOVIE = gql`
  ${EDITABLE_MOVIE}
  mutation UpdateMovie($input: UpdateMovieInput!) {
    updateMovie(input: $input) {
      movie {
        ...EditableMovie
      }
      ${EDIT_ERRORS}
    }
  }
`;

export const UPDATE_SHOW = gql`
  ${EDITABLE_SHOW}
  mutation UpdateShow($input: UpdateShowInput!) {
    updateShow(input: $input) {
      show {
        ...EditableShow
      }
      ${EDIT_ERRORS}
    }
  }
`;

export const UPDATE_EPISODE = gql`
  ${EDITABLE_EPISODE}
  mutation UpdateEpisode($input: UpdateEpisodeInput!) {
    updateEpisode(input: $input) {
      episode {
        ...EditableEpisode
      }
      ${EDIT_ERRORS}
    }
  }
`;
