import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import Button from '../../components/Button/Button';
import Icon from '../../components/Icon/Icon';
import Logo from '../../components/Logo/Logo';
import PasswordField from '../../components/PasswordField/PasswordField';
import TextField from '../../components/TextField/TextField';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useViewer } from '../../hooks/useViewer';
import { queryString } from '../../utils/routes';
import styles from './AuthPage.module.css';

const MIN_PASSWORD = 8;

function useErrorText() {
  const { t } = useTranslation();
  return (result) => {
    switch (result.code) {
      case 'INVALID_CREDENTIALS':
        return t('Wrong e-mail address or password.');
      case 'INACTIVE':
        return t('Your account waits for the administrator to activate it.');
      case 'TOO_MANY_ATTEMPTS':
        return t('Too many attempts. Try again in fifteen minutes.');
      case 'INVALID_EMAIL':
        return t('This e-mail address is not valid.');
      case 'WEAK_PASSWORD':
        return t('The password needs between 8 and 256 characters.');
      case 'EMAIL_TAKEN':
        return t('An account already exists with this address.');
      default:
        return /Unknown field|Cannot query field/.test(result.message ?? '')
          ? t('This server does not handle accounts yet: update open-plex.')
          : t('The server does not answer. Try again.');
    }
  };
}

/** Only paths of this app: `?next=https://elsewhere` must not send anyone away. */
function safeNext(value) {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/';
}

/**
 * /sign-in and /sign-up. A new account waits until the administrator
 * activates it; the session is a cookie the server sets.
 */
export default function AuthPage({ mode }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const session = useViewer();
  const errorText = useErrorText();
  const signingUp = mode === 'sign-up';
  usePageTitle(signingUp ? t('Create an account') : t('Sign in'));

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(null);

  if (session.viewer?.user) return <Navigate to={next} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (signingUp) {
      if (password.length < MIN_PASSWORD) return setError({ field: 'password', text: t('The password needs between 8 and 256 characters.') });
      if (password !== confirmation) return setError({ field: 'confirmation', text: t('The two passwords differ.') });
    }
    setBusy(true);
    const result = signingUp ? await session.signUp(email, password) : await session.signIn(email, password);
    setBusy(false);
    if (result.ok) {
      if (signingUp) setCreated(email.trim());
      else navigate(next, { replace: true });
      return;
    }
    const field = result.field ?? (result.code === 'INVALID_EMAIL' || result.code === 'EMAIL_TAKEN' ? 'email' : result.code === 'WEAK_PASSWORD' ? 'password' : null);
    setError({ field, text: errorText(result), code: result.code });
  };

  const other = signingUp ? '/sign-in' : '/sign-up';
  const otherLink = `${other}${queryString({ next: next === '/' ? null : next })}`;

  return (
    <div className={styles.page}>
      <div className={styles.glow} aria-hidden="true" />
      <main className={styles.card}>
        <Link to="/" className={styles.logo} aria-label={t('Home')}>
          <Logo />
        </Link>

        {created ? (
          <div className={styles.done} role="status">
            <span className={styles.doneIcon}>
              <Icon name="checkCircle" size={30} />
            </span>
            <h1 className={styles.title}>{t('Account created')}</h1>
            <p className={styles.lead}>
              {t('An administrator must activate {{email}} before you can sign in. You will then sign in with this address and password.', { email: created })}
            </p>
            <Button variant="primary" onClick={() => navigate(`/sign-in${queryString({ next: next === '/' ? null : next })}`)}>
              {t('Back to sign in')}
            </Button>
          </div>
        ) : (
          <>
            <h1 className={styles.title}>{signingUp ? t('Create an account') : t('Sign in')}</h1>
            <p className={styles.lead}>
              {signingUp
                ? t('Your account will be usable once an administrator activates it.')
                : session.viewer?.isOperator
                  ? t('You use this server as its operator. Sign in to use your own account.')
                  : t('Sign in to watch your libraries.')}
            </p>

            <form className={styles.form} onSubmit={submit} noValidate>
              <TextField
                label={t('E-mail address')}
                type="email"
                autoComplete={signingUp ? 'email' : 'username'}
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={error?.field === 'email' ? error.text : null}
              />
              <PasswordField
                label={t('Password')}
                autoComplete={signingUp ? 'new-password' : 'current-password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                hint={signingUp ? t('8 characters at least.') : null}
                error={error?.field === 'password' ? error.text : null}
              />
              {signingUp && (
                <PasswordField
                  label={t('Confirm the password')}
                  autoComplete="new-password"
                  required
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  error={error?.field === 'confirmation' ? error.text : null}
                />
              )}
              {error && !['email', 'password', 'confirmation'].includes(error.field) && (
                <p className={styles.error} role="alert" data-code={error.code}>
                  <Icon name={error.code === 'INACTIVE' ? 'lock' : 'info'} size={18} />
                  {error.text}
                </p>
              )}
              <Button type="submit" variant="accent" loading={busy} className={styles.submit}>
                {signingUp ? t('Create the account') : t('Sign in')}
              </Button>
            </form>

            <p className={styles.switch}>
              {signingUp ? t('Already have an account?') : t('No account yet?')}{' '}
              <Link to={otherLink}>{signingUp ? t('Sign in') : t('Create an account')}</Link>
            </p>
          </>
        )}
      </main>
    </div>
  );
}
