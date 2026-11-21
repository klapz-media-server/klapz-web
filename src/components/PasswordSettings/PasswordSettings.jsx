import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { useTranslation } from 'react-i18next';
import { SET_PASSWORD } from '../../graphql/mutations';
import { useAccountErrorText } from '../../hooks/useAccountErrorText';
import Button from '../Button/Button';
import PasswordField from '../PasswordField/PasswordField';
import SettingsSection from '../SettingsSection/SettingsSection';
import styles from './PasswordSettings.module.css';

/**
 * Sets or changes the signed-in user's password: the one it signs in with here and in
 * Jellyfin apps. A user an owner created has none until it sets one here.
 */
export default function PasswordSettings({ user }) {
  const { t } = useTranslation();
  const errorText = useAccountErrorText();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});
  const [done, setDone] = useState(false);
  const [save, saving] = useMutation(SET_PASSWORD);
  const changing = user.hasPassword;

  const submit = async (e) => {
    e.preventDefault();
    setDone(false);
    if (next.length < 8 || next.length > 256) {
      setErrors({ next: errorText({ code: 'WEAK_PASSWORD' }) });
      return;
    }
    if (next !== confirm) {
      setErrors({ confirm: t('The two passwords differ.') });
      return;
    }
    setErrors({});
    try {
      const input = { newPassword: next, currentPassword: changing ? current : null };
      const { data } = await save({ variables: { input } });
      const refusal = data?.setPassword?.userErrors?.[0];
      if (refusal) {
        const field = refusal.field?.at(-1) === 'currentPassword' ? 'current' : 'next';
        setErrors({ [field]: errorText(refusal) });
        return;
      }
      setCurrent('');
      setNext('');
      setConfirm('');
      setDone(true);
    } catch (err) {
      setErrors({ form: errorText({ code: 'NETWORK', message: err.message }) });
    }
  };

  return (
    <SettingsSection
      title={t('Password')}
      description={
        changing
          ? t('The password you sign in with, here and in Jellyfin apps.')
          : t('You have no password yet: your account was created by an owner. Set one to sign in with it, here and in Jellyfin apps.')
      }
    >
      <form className={styles.form} onSubmit={submit} noValidate>
        {changing && (
          <PasswordField
            label={t('Current password')}
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            error={errors.current}
            required
          />
        )}
        <PasswordField
          label={t('New password')}
          autoComplete="new-password"
          hint={errors.next ? null : t('Between 8 and 256 characters.')}
          value={next}
          onChange={(e) => setNext(e.target.value)}
          error={errors.next}
          required
        />
        <PasswordField
          label={t('Confirm the new password')}
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={errors.confirm}
          required
        />
        {errors.form && (
          <p className={styles.failure} role="alert">
            {errors.form}
          </p>
        )}
        {done && (
          <p className={styles.done} role="status">
            {t('Password saved.')}
          </p>
        )}
        <div>
          <Button type="submit" variant="accent" icon="lock" loading={saving.loading}>
            {changing ? t('Change the password') : t('Set a password')}
          </Button>
        </div>
      </form>
    </SettingsSection>
  );
}
