import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { useTranslation } from 'react-i18next';
import { MOVE_PLEX, PAIR_PLEX, UNPAIR_PLEX } from '../../graphql/mutations';
import { VIEWER } from '../../graphql/queries';
import { formatDate } from '../../utils/format';
import Button from '../Button/Button';
import Dialog from '../Dialog/Dialog';
import Icon from '../Icon/Icon';
import SettingsSection from '../SettingsSection/SettingsSection';
import TextField from '../TextField/TextField';
import styles from './PlexSettings.module.css';

const refetch = { refetchQueries: [{ query: VIEWER }], awaitRefetchQueries: true };
const CLAIM_URL = 'https://plex.tv/claim';

/** The server's messages are English; the address one is the one people hit. */
function useErrorText() {
  const { t } = useTranslation();
  return (error) => {
    const message = error?.message ?? '';
    if (/must look like https:\/\/host:port/.test(message)) return t('The address must look like https://host:port, with nothing after it.');
    if (/not found/i.test(message)) return t('You are not allowed to do this.');
    return message;
  };
}

function PairForm({ user }) {
  const { t } = useTranslation();
  const errorText = useErrorText();
  const [code, setCode] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState(null);
  const [pair, pairing] = useMutation(PAIR_PLEX, refetch);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await pair({
        variables: { input: { userId: user.id, extension: 'PLEX', code: code.trim(), connectionUri: address.trim() } },
      });
    } catch (err) {
      setError(errorText(err));
    }
  };

  return (
    <form className={styles.steps} onSubmit={submit}>
      <ol className={styles.stepList}>
        <li className={styles.step}>
          <span className={styles.stepNumber}>1</span>
          <div className={styles.stepBody}>
            <strong>{t('Get a claim code')}</strong>
            <p>{t('Signed in to your Plex account, open plex.tv/claim. The code works once and lasts four minutes.')}</p>
            <a className={styles.external} href={CLAIM_URL} target="_blank" rel="noreferrer">
              {t('Open plex.tv/claim')} <Icon name="share" size={14} />
            </a>
          </div>
        </li>
        <li className={styles.step}>
          <span className={styles.stepNumber}>2</span>
          <div className={styles.stepBody}>
            <TextField
              label={t('Claim code')}
              placeholder="claim-xxxxxxxxxxxxxxxxxxxx"
              autoComplete="off"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
        </li>
        <li className={styles.step}>
          <span className={styles.stepNumber}>3</span>
          <div className={styles.stepBody}>
            <TextField
              label={t('Address of your server')}
              hint={t('Where Plex apps will reach this server, as https://host:port — a domain or a tunnel pointing here.')}
              placeholder="https://plex.example.org:443"
              autoComplete="off"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
        </li>
      </ol>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <div className={styles.actions}>
        <Button type="submit" variant="accent" icon="check" loading={pairing.loading}>
          {t('Pair with Plex')}
        </Button>
      </div>
    </form>
  );
}

function Paired({ user, plex }) {
  const { t } = useTranslation();
  const errorText = useErrorText();
  const account = plex.account;
  const [editing, setEditing] = useState(false);
  const [address, setAddress] = useState(account.connectionUri);
  const [error, setError] = useState(null);
  const [confirmUnpair, setConfirmUnpair] = useState(false);
  const [move, moving] = useMutation(MOVE_PLEX, refetch);
  const [unpair, unpairing] = useMutation(UNPAIR_PLEX, refetch);

  const save = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await move({ variables: { input: { userId: user.id, extension: 'PLEX', connectionUri: address.trim() } } });
      setEditing(false);
    } catch (err) {
      setError(errorText(err));
    }
  };

  const published = account.publishedAt
    ? t('Published on plex.tv {{date}}', { date: formatDate(account.publishedAt) })
    : t('Not published yet: the server keeps trying.');

  return (
    <>
      <div className={styles.paired}>
        <span className={styles.pairedIcon}>
          <Icon name="checkCircle" size={22} />
        </span>
        <dl className={styles.facts}>
          <div>
            <dt>{t('Plex account')}</dt>
            <dd>{account.accountName}</dd>
          </div>
          <div>
            <dt>{t('Address')}</dt>
            <dd className={styles.mono}>{account.connectionUri}</dd>
          </div>
          <div>
            <dt>{t('Status')}</dt>
            <dd data-pending={!account.publishedAt || undefined}>{published}</dd>
          </div>
        </dl>
      </div>

      {editing ? (
        <form className={styles.inline} onSubmit={save}>
          <TextField
            className={styles.grow}
            label={t('New address')}
            hint={t('A tunnel or a new domain: Plex apps are told at once, no need to pair again.')}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            error={error}
            required
          />
          <div className={styles.inlineActions}>
            <Button variant="ghost" onClick={() => setEditing(false)}>
              {t('Cancel')}
            </Button>
            <Button type="submit" variant="accent" loading={moving.loading}>
              {t('Save')}
            </Button>
          </div>
        </form>
      ) : (
        <div className={styles.actions}>
          <Button size="sm" icon="globe" onClick={() => setEditing(true)}>
            {t('Change address')}
          </Button>
          <Button size="sm" variant="danger" onClick={() => setConfirmUnpair(true)}>
            {t('Unpair')}
          </Button>
        </div>
      )}

      <Dialog
        open={confirmUnpair}
        onClose={() => setConfirmUnpair(false)}
        title={t('Unpair from {{account}}?', { account: account.accountName })}
        description={t('Plex apps that found this server through plex.tv stop reaching it. You can pair again with a new claim code.')}
        actions={
          <>
            <Button variant="ghost" onClick={() => setConfirmUnpair(false)}>
              {t('Cancel')}
            </Button>
            <Button
              variant="danger"
              loading={unpairing.loading}
              onClick={async () => {
                try {
                  await unpair({ variables: { userId: user.id } });
                } finally {
                  setConfirmUnpair(false);
                }
              }}
            >
              {t('Unpair')}
            </Button>
          </>
        }
      />
    </>
  );
}

/**
 * The user's own Plex pairing: ties their side of this server to their
 * plex.tv account, so Plex apps find it there.
 */
export default function PlexSettings({ session }) {
  const { t } = useTranslation();
  const { user } = session;
  const plex = user?.extensions.nodes.find((e) => e.extension === 'PLEX');

  const description = t('Link your part of this server to your plex.tv account, so the Plex apps on your devices find it.');

  if (!user) return null;

  if (!plex?.enabled) {
    return (
      <SettingsSection title={t('Plex')} description={description}>
        <p className={styles.notice}>{t('Plex access is not enabled for your account. Ask an owner of the server to enable it.')}</p>
      </SettingsSection>
    );
  }

  return (
    <SettingsSection
      title={t('Plex')}
      description={description}
      aside={
        <span className={styles.badge} data-on={!!plex.account || undefined}>
          {plex.account ? t('Paired') : t('Not paired')}
        </span>
      }
    >
      {plex.account ? <Paired user={user} plex={plex} /> : <PairForm user={user} />}
      <p className={styles.serverId}>
        {t('Your server identifier')} <code>{plex.externalId}</code>
      </p>
    </SettingsSection>
  );
}
