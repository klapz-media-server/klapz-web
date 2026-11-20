import { useTranslation } from 'react-i18next';

/** What the server accepts as a username, checked before asking it. */
export const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,31}$/i;

/** The form field an `AccountErrorCode` belongs to, when the server names none. */
export const FIELD_OF_ACCOUNT_ERROR = {
  INVALID_USERNAME: 'username',
  USERNAME_TAKEN: 'username',
  INVALID_EMAIL: 'email',
  EMAIL_TAKEN: 'email',
  WEAK_PASSWORD: 'password',
};

/**
 * The words for a refusal of an account mutation: `{ code }` an `AccountErrorCode` from
 * `userErrors`, or `NETWORK` when the request itself failed.
 */
export function useAccountErrorText() {
  const { t } = useTranslation();
  return ({ code, message }) => {
    switch (code) {
      case 'INVALID_CREDENTIALS':
        return t('Wrong username, e-mail address or password.');
      case 'INACTIVE':
        return t('Your account waits for an owner of the server to activate it.');
      case 'TOO_MANY_ATTEMPTS':
        return t('Too many attempts. Try again in fifteen minutes.');
      case 'INVALID_USERNAME':
        return t('3 to 32 letters, digits, dots, dashes or underscores, starting with a letter or a digit.');
      case 'USERNAME_TAKEN':
        return t('This username is taken.');
      case 'INVALID_EMAIL':
        return t('This e-mail address is not valid.');
      case 'WEAK_PASSWORD':
        return t('The password needs between 8 and 256 characters.');
      case 'EMAIL_TAKEN':
        return t('An account already exists with this address.');
      case 'USER_NOT_FOUND':
        return t('This user no longer exists.');
      case 'BUILT_IN_ACCOUNT':
        return t('The built-in admin account stays an active owner: it cannot be demoted, deactivated or deleted.');
      case 'NETWORK':
        return t('The server does not answer. Try again.');
      default:
        return message || t('The server refused the request.');
    }
  };
}
