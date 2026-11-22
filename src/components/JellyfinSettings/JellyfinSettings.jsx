import { useState } from 'react';
import { Link } from 'react-router';
import { useMutation } from '@apollo/client/react';
import { useTranslation } from 'react-i18next';
import { CONNECT_JELLYFIN, DISABLE_JELLYFIN, FORGET_JELLYFIN_DEVICE } from '../../graphql/mutations';
import { VIEWER } from '../../graphql/queries';
import { activeServer } from '../../servers/serverStore';
import { formatDate } from '../../utils/format';
import Button from '../Button/Button';
import Dialog from '../Dialog/Dialog';
import Icon from '../Icon/Icon';
import SettingsSection from '../SettingsSection/SettingsSection';
import TextField from '../TextField/TextField';
import styles from './JellyfinSettings.module.css';

const refetch = { refetchQueries: [{ query: VIEWER }], awaitRefetchQueries: true };

/**
 * The address Jellyfin apps are given: the chosen server's, below `/jellyfin`. Without one,
 * this page's own origin.
 */
export function jellyfinAddress(base = activeServer()?.url ?? window.location.origin) {
  return `${base}/jellyfin`;
}

export function jellyfinOf(user) {
  return user?.extensions.nodes.find((e) => e.extension === 'JELLYFIN') ?? null;
}

function CopyField({ label, value }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      /* the field stays selectable */
    }
  };
  return (
    <div className={styles.copyRow}>
      <TextField className={styles.grow} label={label} readOnly value={value} onFocus={(e) => e.target.select()} />
      <Button icon={copied ? 'check' : 'share'} onClick={copy}>
        {copied ? t('Copied') : t('Copy')}
      </Button>
    </div>
  );
}

function Devices({ user, devices }) {
  const { t } = useTranslation();
  const [forget, forgetting] = useMutation(FORGET_JELLYFIN_DEVICE, refetch);
  const [pending, setPending] = useState(null);
  if (!devices.length) {
    return <p className={styles.muted}>{t('No Jellyfin app has signed in yet.')}</p>;
  }
  return (
    <ul className={styles.devices}>
      {devices.map((device) => (
        <li key={device.deviceId} className={styles.device}>
          <Icon name="tv" size={18} />
          <div className={styles.deviceInfo}>
            <strong>{device.deviceName}</strong>
            <span>
              {device.client} {device.clientVersion} · {t('Signed in on {{date}}', { date: formatDate(device.signedInAt) })}
            </span>
          </div>
          <Button
            size="sm"
            variant="danger"
            loading={forgetting.loading && pending === device.deviceId}
            onClick={async () => {
              setPending(device.deviceId);
              try {
                await forget({ variables: { userId: user.id, deviceId: device.deviceId } });
              } finally {
                setPending(null);
              }
            }}
          >
            {t('Sign out')}
          </Button>
        </li>
      ))}
    </ul>
  );
}

/**
 * Exposes the user's libraries to Jellyfin apps: switching the Jellyfin connection on and off,
 * the address and credentials to give an app, and the apps signed in.
 */
export default function JellyfinSettings({ session }) {
  const { t } = useTranslation();
  const { user } = session;
  const [connect, connecting] = useMutation(CONNECT_JELLYFIN, refetch);
  const [disable, disabling] = useMutation(DISABLE_JELLYFIN, refetch);
  const [confirmOff, setConfirmOff] = useState(false);
  const [failure, setFailure] = useState(null);
  if (!user) return null;

  const jellyfin = jellyfinOf(user);
  const enabled = !!jellyfin?.enabled;
  const devices = jellyfin?.devices ?? [];
  const run = async (mutate) => {
    setFailure(null);
    try {
      await mutate({ variables: { userId: user.id } });
    } catch (err) {
      setFailure(/not found/i.test(err.message) ? t('You are not allowed to do this.') : err.message);
    }
  };

  return (
    <div className={styles.stack}>
      <SettingsSection
        title={t('Jellyfin')}
        description={t('Watch your libraries in the Jellyfin apps — on a TV, a phone or Jellyfin Web — by signing in to this server with your own username and password.')}
        aside={
          <span className={styles.badge} data-on={enabled || undefined}>
            {enabled ? t('Enabled') : t('Off')}
          </span>
        }
      >
        {!user.hasPassword && (
          <p className={styles.warning} role="note">
            <Icon name="lock" size={15} />
            <span>
              {t('Jellyfin apps sign in with a password, and you have none yet.')}{' '}
              <Link to="/settings/password">{t('Set one in your account settings.')}</Link>
            </span>
          </p>
        )}
        {failure && (
          <p className={styles.failure} role="alert">
            {failure}
          </p>
        )}
        {enabled ? (
          <>
            <ol className={styles.steps}>
              <li>
                <span>{t('In the Jellyfin app, add a server and enter this address:')}</span>
                <CopyField label={t('Server address')} value={jellyfinAddress()} />
              </li>
              <li>
                <span>{t('Sign in as {{username}}, with your password.', { username: user.username })}</span>
                <span className={styles.muted}>{t('You see the libraries you were given here, nothing more.')}</span>
              </li>
            </ol>
            <p className={styles.muted}>
              {t('The address must be one the device reaches: from outside your network, use the domain or tunnel that leads to this server.')}
            </p>
            <div className={styles.actions}>
              <Button size="sm" variant="danger" onClick={() => setConfirmOff(true)}>
                {t('Disable Jellyfin')}
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className={styles.muted}>{t('Off: Jellyfin apps cannot sign in to your account.')}</p>
            <div className={styles.actions}>
              <Button variant="accent" icon="check" loading={connecting.loading} onClick={() => run(connect)}>
                {t('Enable Jellyfin')}
              </Button>
            </div>
          </>
        )}
      </SettingsSection>

      {enabled && (
        <SettingsSection title={t('Signed-in apps')} description={t('Each app keeps its own access. Sign one out and it asks for your password again.')}>
          <Devices user={user} devices={devices} />
        </SettingsSection>
      )}

      <Dialog
        open={confirmOff}
        onClose={() => setConfirmOff(false)}
        title={t('Disable Jellyfin?')}
        description={t('Every Jellyfin app signed in to your account is signed out. You can enable it again at any time.')}
        actions={
          <>
            <Button variant="ghost" onClick={() => setConfirmOff(false)}>
              {t('Cancel')}
            </Button>
            <Button
              variant="danger"
              loading={disabling.loading}
              onClick={async () => {
                await run(disable);
                setConfirmOff(false);
              }}
            >
              {t('Disable')}
            </Button>
          </>
        }
      />
    </div>
  );
}
