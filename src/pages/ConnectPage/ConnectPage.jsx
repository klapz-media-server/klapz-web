import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import Button from '../../components/Button/Button';
import Icon from '../../components/Icon/Icon';
import Logo from '../../components/Logo/Logo';
import TextField from '../../components/TextField/TextField';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useServers, useSwitchServer } from '../../hooks/useServers';
import { safeNext } from '../../utils/routes';
import auth from '../AuthPage/AuthPage.module.css';
import styles from './ConnectPage.module.css';

/** The state of a server, as a coloured dot and a word. */
export function ServerStatus({ status }) {
  const { t } = useTranslation();
  const labels = {
    checking: t('Checking…'),
    online: t('Online'),
    offline: t('Unreachable'),
    blocked: t('Access refused'),
    invalid: t('Not a Klapz server'),
  };
  if (!status) return null;
  return (
    <span className={styles.status} data-status={status}>
      <span className={styles.dot} aria-hidden="true" />
      {labels[status]}
    </span>
  );
}

function useFailureText() {
  const { t } = useTranslation();
  return (code) => {
    switch (code) {
      case 'INVALID_ADDRESS':
        return t('Enter an IP address or a domain name, with a port if needed.');
      case 'INSECURE':
        return t('This page is served over HTTPS: it can only reach a server over HTTPS.');
      case 'blocked':
        return t('The server answers, but does not allow this page ({{origin}}) to talk to it.', { origin: window.location.origin });
      case 'invalid':
        return t('Something answers at this address, but it is not a Klapz server.');
      default:
        return t('No Klapz server answers at this address (HTTPS and HTTP, ports 443, 80 and 32500 tried).');
    }
  };
}

function AttemptIcon({ result }) {
  if (!result) return <span className={styles.attemptSpinner} aria-hidden="true" />;
  if (result.status === 'online') return <Icon name="checkCircle" size={16} />;
  return <Icon name="close" size={16} />;
}

/** Adding a server: the address typed, then each address tried, live. */
function AddServerForm({ onAdded, autoFocus, initialValue = '' }) {
  const { t } = useTranslation();
  const { add } = useServers();
  const failureText = useFailureText();
  const [input, setInput] = useState(initialValue);
  const [busy, setBusy] = useState(false);
  const [attempts, setAttempts] = useState([]);
  const [error, setError] = useState(null);
  const abort = useRef(null);

  useEffect(() => () => abort.current?.abort(), []);

  const submit = async (e) => {
    e.preventDefault();
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setError(null);
    setAttempts([]);
    setBusy(true);
    const result = await add(input, {
      signal: controller.signal,
      onProgress: (url, attempt) =>
        setAttempts((list) =>
          list.some((a) => a.url === url)
            ? list.map((a) => (a.url === url ? { url, result: attempt } : a))
            : [...list, { url, result: attempt }],
        ),
    });
    if (controller.signal.aborted) return;
    setBusy(false);
    if (result.ok) onAdded(result.server);
    else setError(failureText(result.code));
  };

  return (
    <form className={auth.form} onSubmit={submit} noValidate>
      <TextField
        label={t('Server address')}
        placeholder="192.168.1.10, media.example.com:32500…"
        autoComplete="url"
        autoCapitalize="none"
        spellCheck={false}
        inputMode="url"
        autoFocus={autoFocus}
        required
        value={input}
        onChange={(e) => setInput(e.target.value)}
        hint={t('IP address or domain name, and a port if it is not a usual one.')}
      />
      {attempts.length > 0 && (
        <ul className={styles.attempts} aria-live="polite">
          {attempts.map((a) => (
            <li key={a.url} data-status={a.result?.status ?? 'checking'}>
              <AttemptIcon result={a.result} />
              <span>{a.url}</span>
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p className={auth.error} role="alert">
          <Icon name="info" size={18} />
          {error}
        </p>
      )}
      <Button type="submit" variant="accent" loading={busy} className={auth.submit} disabled={!input.trim()}>
        {t('Connect')}
      </Button>
    </form>
  );
}

/**
 * /connect: the first screen when no server is chosen, and where servers are switched,
 * added and removed. Once one is chosen, the app starts over on it (sign-in if needed).
 */
export default function ConnectPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const { servers, active, remove, refresh } = useServers({ watchStatus: true });
  const switchServer = useSwitchServer();
  const [adding, setAdding] = useState(false);
  const onboarding = servers.length === 0;
  usePageTitle(onboarding ? t('Connect to a server') : t('Servers'));

  const connected = (server) => switchServer(server.id, next);

  return (
    <div className={auth.page}>
      <div className={auth.glow} aria-hidden="true" />
      <main className={auth.card}>
        <span className={auth.logo}>
          <Logo />
        </span>

        {onboarding ? (
          <>
            <h1 className={auth.title}>{t('Connect to a server')}</h1>
            <p className={auth.lead}>{t('Enter the address of your Klapz server to start.')}</p>
            {/* Served by a Klapz server, the page's own address is the likely one; not by the dev server. */}
            <AddServerForm
              onAdded={connected}
              autoFocus
              initialValue={import.meta.env.DEV ? '' : window.location.host}
            />
          </>
        ) : (
          <>
            <div className={styles.heading}>
              <h1 className={auth.title}>{t('Servers')}</h1>
              <Button variant="ghost" size="sm" icon="replay" onClick={refresh} aria-label={t('Check again')} title={t('Check again')} />
            </div>
            <p className={auth.lead}>{t('Choose the server to watch from.')}</p>

            <ul className={styles.list}>
              {servers.map((server) => {
                const current = server.id === active?.id;
                return (
                  <li key={server.id} className={styles.row} data-current={current || undefined}>
                    <button
                      type="button"
                      className={styles.select}
                      onClick={() => (current ? navigate(next) : connected(server))}
                      aria-current={current || undefined}
                    >
                      <span className={styles.icon} aria-hidden="true">
                        <Icon name="server" size={20} />
                      </span>
                      <span className={styles.info}>
                        <strong>
                          {server.name}
                          {current && <span className={styles.badge}>{t('Current')}</span>}
                        </strong>
                        <span className={styles.url}>{server.url}</span>
                        <ServerStatus status={server.status} />
                      </span>
                    </button>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon="trash"
                      className={styles.remove}
                      onClick={() => remove(server.id)}
                      aria-label={t('Remove {{name}}', { name: server.name })}
                      title={t('Remove')}
                    />
                  </li>
                );
              })}
            </ul>

            {adding ? (
              <div className={styles.add}>
                <h2 className={styles.subtitle}>{t('Add a server')}</h2>
                <AddServerForm onAdded={connected} autoFocus />
                <Button variant="ghost" onClick={() => setAdding(false)} className={styles.cancel}>
                  {t('Cancel')}
                </Button>
              </div>
            ) : (
              <Button variant="secondary" icon="plus" onClick={() => setAdding(true)} className={styles.addButton}>
                {t('Add a server')}
              </Button>
            )}

            {active && (
              <p className={auth.switch}>
                <Link to={next}>{t('Back to {{name}}', { name: active.name })}</Link>
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
}
