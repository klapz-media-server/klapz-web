import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { useTranslation } from 'react-i18next';
import { SET_PASSWORD } from '../../graphql/mutations';
import { useAccountErrorText } from '../../hooks/useAccountErrorText';
import Button from '../Button/Button';
import Dialog from '../Dialog/Dialog';
import PasswordField from '../PasswordField/PasswordField';
import styles from './UserPasswordDialog.module.css';

const ALPHABET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Sixteen characters drawn by the browser's RNG, without the ones read alike (0/O, 1/l/I). */
export function generatedPassword(length = 16) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  // 256 is not a multiple of the alphabet's size; the bias this leaves is negligible here.
  return Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join('');
}

/**
 * An owner sets or resets a user's password, to hand it over: what a user created without one
 * needs to sign in here and in Jellyfin apps. No current password is asked.
 */
export default function UserPasswordDialog({ user, onClose }) {
  const { t } = useTranslation();
  const errorText = useAccountErrorText();
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [save, saving] = useMutation(SET_PASSWORD);

  const close = () => {
    setPassword('');
    setError(null);
    setSaved(false);
    onClose();
  };

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 8 || password.length > 256) {
      setError(errorText({ code: 'WEAK_PASSWORD' }));
      return;
    }
    setError(null);
    try {
      const { data } = await save({ variables: { input: { userId: user.id, newPassword: password } } });
      const refusal = data?.setPassword?.userErrors?.[0];
      if (refusal) setError(errorText(refusal));
      else setSaved(true);
    } catch (err) {
      setError(errorText({ code: 'NETWORK', message: err.message }));
    }
  };

  return (
    <Dialog
      open={!!user}
      onClose={() => !saving.loading && close()}
      title={user?.hasPassword ? t('Reset the password of {{username}}', { username: user?.username }) : t('Give {{username}} a password', { username: user?.username })}
      description={t('Hand it over to the user: they sign in with it here and in Jellyfin apps, and can change it in their settings.')}
      actions={
        saved ? (
          <Button variant="primary" onClick={close}>
            {t('Done')}
          </Button>
        ) : (
          <>
            <Button variant="ghost" onClick={close} disabled={saving.loading}>
              {t('Cancel')}
            </Button>
            <Button type="submit" form="user-password" variant="accent" icon="lock" loading={saving.loading}>
              {t('Save')}
            </Button>
          </>
        )
      }
    >
      <form id="user-password" className={styles.form} onSubmit={submit} noValidate>
        <div className={styles.row}>
          <div className={styles.grow}>
            <PasswordField
              label={t('New password')}
              autoComplete="new-password"
              value={password}
              readOnly={saved}
              onChange={(e) => {
                setPassword(e.target.value);
                setSaved(false);
              }}
              error={error}
              hint={error ? null : t('Between 8 and 256 characters.')}
            />
          </div>
          {!saved && <Button onClick={() => setPassword(generatedPassword())}>{t('Generate')}</Button>}
        </div>
        {saved && (
          <p className={styles.done} role="status">
            {t('Password saved. Copy it now: it is not shown again.')}
          </p>
        )}
      </form>
    </Dialog>
  );
}
